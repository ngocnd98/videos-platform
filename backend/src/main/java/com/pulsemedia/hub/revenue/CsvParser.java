package com.pulsemedia.hub.revenue;

import java.util.ArrayList;
import java.util.List;

/** RFC 4180-style CSV: quoted fields, doubled quotes, CRLF or LF line endings. */
final class CsvParser {

    private CsvParser() {
    }

    static List<List<String>> parse(String text) {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;
        String s = text.startsWith("﻿") ? text.substring(1) : text; // Excel's UTF-8 BOM
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (quoted) {
                if (c == '"' && i + 1 < s.length() && s.charAt(i + 1) == '"') {
                    field.append('"');
                    i++;
                } else if (c == '"') {
                    quoted = false;
                } else {
                    field.append(c);
                }
            } else if (c == '"') {
                quoted = true;
            } else if (c == ',') {
                row.add(field.toString());
                field.setLength(0);
            } else if (c == '\n' || c == '\r') {
                if (c == '\r' && i + 1 < s.length() && s.charAt(i + 1) == '\n') {
                    i++;
                }
                row.add(field.toString());
                field.setLength(0);
                addIfNotBlank(rows, row);
                row = new ArrayList<>();
            } else {
                field.append(c);
            }
        }
        if (quoted) {
            throw new IllegalArgumentException("The CSV contains an unfinished quoted field.");
        }
        row.add(field.toString());
        addIfNotBlank(rows, row);
        return rows;
    }

    private static void addIfNotBlank(List<List<String>> rows, List<String> row) {
        if (row.stream().anyMatch(f -> !f.isBlank())) {
            rows.add(row);
        }
    }
}
