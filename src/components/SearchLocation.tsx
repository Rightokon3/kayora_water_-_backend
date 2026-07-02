import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { AddressSuggestion } from "@/types/location";

type SearchLocationProps = {
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
};

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

function parseDisplayName(displayName: string): { title: string; subtitle: string } {
  const parts = displayName.split(",").map((part) => part.trim());
  const title = parts[0] ?? displayName;
  const subtitle = parts.slice(1).join(", ") || displayName;
  return { title, subtitle };
}

export function SearchLocation({ onSelectSuggestion, placeholder }: SearchLocationProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (searchText: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const url = `${NOMINATIM_BASE_URL}?q=${encodeURIComponent(
        searchText
      )}&format=json&addressdetails=0&limit=8`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "Accept-Language": "en",
        },
      });

      if (!response.ok) {
        setSuggestions([]);
        return;
      }

      const data: Array<{
        place_id: number;
        display_name: string;
        lat: string;
        lon: string;
      }> = await response.json();

      const parsed: AddressSuggestion[] = data.map((item) => {
        const { title, subtitle } = parseDisplayName(item.display_name);
        return {
          id: String(item.place_id),
          title,
          subtitle,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        };
      });

      setSuggestions(parsed);
    } catch (error) {
      // Aborted requests land here too — only clear results for real
      // failures, not for a request we intentionally cancelled.
      if ((error as Error).name !== "AbortError") {
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tracks whether the *last* text change came from the user typing
  // vs. from handleSelect setting the query to the chosen address.
  // Selecting a suggestion intentionally re-fills the input with the
  // full address text — without this flag, that re-fill would itself
  // be treated as a new search query and immediately re-fetch/re-open
  // the suggestions dropdown right after picking one.
  const suppressNextSearchRef = useRef(false);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return;
    }

    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      runSearch(query.trim());
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, runSearch]);

  const handleSelect = useCallback(
    (suggestion: AddressSuggestion) => {
      // Cancel any pending blur-driven hide — selecting a suggestion
      // should close the dropdown deliberately, not race with blur.
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      suppressNextSearchRef.current = true;
      onSelectSuggestion(suggestion);
      setQuery(`${suggestion.title}, ${suggestion.subtitle}`);
      setSuggestions([]);
      setIsFocused(false);
    },
    [onSelectSuggestion]
  );

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay hiding the results so a tap on a suggestion row (which
    // blurs the TextInput first) has time to register its onPress
    // before the dropdown unmounts. Without this delay, the results
    // View disappears the instant the input blurs and the tap never
    // reaches handleSelect — which is what was silently swallowing
    // selections.
    blurTimeoutRef.current = setTimeout(() => {
      setIsFocused(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const showResults = isFocused && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <View style={styles.container}>
      <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
        <Ionicons name="search" size={18} color={Colors.grayText} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder ?? "Search for an address"}
          placeholderTextColor={Colors.placeholder}
          style={styles.input}
          autoCorrect={false}
        />
        {isLoading && <ActivityIndicator size="small" color={Colors.primaryBlue} />}
      </View>

      {showResults && (
        <View style={styles.resultsContainer}>
          {suggestions.length === 0 && !isLoading && (
            <Text style={styles.emptyText}>No matching addresses found</Text>
          )}
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={Colors.primaryBlue}
                  style={styles.resultIcon}
                />
                <View style={styles.resultTextColumn}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.resultSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 50,
  },
  searchBarFocused: {
    backgroundColor: Colors.white,
    borderColor: Colors.success,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.darkText,
    height: "100%",
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 320,
    overflow: "hidden",
  },
  emptyText: {
    padding: 16,
    fontSize: 13,
    color: Colors.grayText,
    textAlign: "center",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultRowPressed: {
    backgroundColor: Colors.lightBlue,
  },
  resultIcon: {
    marginRight: 10,
  },
  resultTextColumn: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.darkText,
  },
  resultSubtitle: {
    fontSize: 12,
    color: Colors.grayText,
    marginTop: 2,
  },
});