package com.sih.legalmetriscan.service;

import com.sih.legalmetriscan.model.StatutoryField;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ExtractionEngine {

    public String normalizeOcrText(String rawText) {
        if (rawText == null || rawText.isBlank()) return "";
        return rawText
                .replaceAll("\\r\\n", "\n")
                .replaceAll("\\r", "\n")
                .replaceAll("[ \\t]+", " ")
                .replaceAll("(?i)\\bR5[.\\s]", "Rs. ")
                .replaceAll("(?i)\\bR\\.s\\.?", "Rs. ")
                .replaceAll("(?i)\\b1NR\\b", "INR")
                .replaceAll("(?i)\\bFSSAl\\b", "FSSAI")
                .replaceAll("(?i)\\bF5SAI\\b", "FSSAI")
                .replaceAll("(?i)\\bLic\\.?\\s*N0\\b", "Lic. No")
                .replaceAll("(?i)\\bN\\.?\\s*WT\\.?\\b", "Net Wt.")
                .replaceAll("(?i)\\bNet\\s*0ty\\b", "Net Qty")
                .trim();
    }

    public Map<String, Object> extractDeclarationsFromText(String rawText, int confidence) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (rawText == null || rawText.isBlank()) {
            return result;
        }

        String norm = normalizeOcrText(rawText);
        String[] lines = norm.split("\n");

        // 1. MRP Extraction
        Pattern mrpPattern = Pattern.compile("(?i)(?:MRP|M\\.?R\\.?P|MAX(?:IMUM)?\\s*RETAIL|RS\\.?|₹)\\s*[:.\\-]?\\s*(?:₹|Rs\\.?|INR)?\\s*([0-9]+(?:\\.[0-9]{1,2})?)");
        Matcher mrpMatcher = mrpPattern.matcher(norm);
        if (mrpMatcher.find()) {
            String val = "₹ " + mrpMatcher.group(1);
            result.put("mrp", StatutoryField.detected(val, mrpMatcher.group(0).trim(), "HIGH"));
        } else {
            result.put("mrp", StatutoryField.notDetected());
        }

        // 2. Net Quantity Extraction
        String netQty = extractNetQuantityFallback(norm);
        if (!"Not detected".equals(netQty)) {
            result.put("netQuantity", StatutoryField.detected(netQty, netQty, "HIGH"));
        } else {
            result.put("netQuantity", StatutoryField.notDetected());
        }

        // 3. FSSAI License Number (14 digits)
        Pattern fssaiPattern = Pattern.compile("(?i)(?:FSSAI|LIC\\.?\\s*NO\\.?|LICENCE\\s*NO\\.?)\\s*[:.\\-]?\\s*([12]\\d{13})|\\b([12]\\d{13})\\b");
        Matcher fssaiMatcher = fssaiPattern.matcher(norm);
        if (fssaiMatcher.find()) {
            String lic = fssaiMatcher.group(1) != null ? fssaiMatcher.group(1) : fssaiMatcher.group(2);
            result.put("fssaiNumber", StatutoryField.detected(lic, fssaiMatcher.group(0).trim(), "HIGH"));
        } else {
            result.put("fssaiNumber", StatutoryField.notDetected());
        }

        // 4. Batch / Lot Number
        Pattern batchPattern = Pattern.compile("(?i)(?:BATCH(?:\\s*NO)?|LOT(?:\\s*NO)?|B\\.NO)\\s*[:.\\-]?\\s*([A-Z0-9\\-]+)");
        Matcher batchMatcher = batchPattern.matcher(norm);
        if (batchMatcher.find()) {
            result.put("batch", StatutoryField.detected(batchMatcher.group(1), batchMatcher.group(0).trim(), "HIGH"));
            result.put("batchNumber", result.get("batch"));
        } else {
            result.put("batch", StatutoryField.notDetected());
            result.put("batchNumber", StatutoryField.notDetected());
        }

        // 5. Manufacturing Date
        Pattern mfgPattern = Pattern.compile("(?i)(?:MFD|MFG|PACKED|PKD|DATE\\s*OF\\s*(?:MFG|PACKING))\\s*[:.\\-]?\\s*([0-9]{1,2}[/.\\-][0-9]{1,2}[/.\\-][0-9]{2,4}|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\\s,.-]+20\\d\\d)");
        Matcher mfgMatcher = mfgPattern.matcher(norm);
        if (mfgMatcher.find()) {
            result.put("manufacturingDate", StatutoryField.detected(mfgMatcher.group(1), mfgMatcher.group(0).trim(), "HIGH"));
        } else {
            result.put("manufacturingDate", StatutoryField.notDetected());
        }

        // 6. Best Before / Expiry Date
        Pattern bbPattern = Pattern.compile("(?i)(?:BEST\\s*BEFORE|EXPIRY|EXP(?:\\s*DATE)?|USE\\s*BY)\\s*[:.\\-]?\\s*([0-9]{1,2}[/.\\-][0-9]{1,2}[/.\\-][0-9]{2,4}|[0-9]+\\s*(?:MONTHS|DAYS|YEARS)(?:\\s*FROM\\s*(?:MFD|MFG|PACKING))?|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\\s,.-]+20\\d\\d)");
        Matcher bbMatcher = bbPattern.matcher(norm);
        if (bbMatcher.find()) {
            result.put("bestBefore", StatutoryField.detected(bbMatcher.group(1), bbMatcher.group(0).trim(), "HIGH"));
        } else {
            result.put("bestBefore", StatutoryField.notDetected());
        }

        // 7. Manufacturer
        Pattern mfrPattern = Pattern.compile("(?i)(?:MANUFACTURED\\s*(?:BY|FOR)|MFD\\.?\\s*(?:BY|FOR)|PACKED\\s*BY)\\s*[:.\\-]?\\s*([^\\n]+)");
        Matcher mfrMatcher = mfrPattern.matcher(norm);
        if (mfrMatcher.find()) {
            String mfrText = mfrMatcher.group(1).trim();
            result.put("manufacturer", StatutoryField.detected(mfrText, mfrMatcher.group(0).trim(), "HIGH"));
        } else {
            result.put("manufacturer", StatutoryField.notDetected());
        }

        // 8. Customer Care
        Pattern ccPattern = Pattern.compile("(?i)(?:CUSTOMER\\s*CARE|CONSUMER\\s*CARE|FEEDBACK|HELPLINE|TOLL\\s*FREE)\\s*[:.\\-]?\\s*([^\\n]+)");
        Matcher ccMatcher = ccPattern.matcher(norm);
        if (ccMatcher.find()) {
            result.put("customerCare", StatutoryField.detected(ccMatcher.group(1).trim(), ccMatcher.group(0).trim(), "HIGH"));
        } else {
            result.put("customerCare", StatutoryField.notDetected());
        }

        return result;
    }

    public String extractNetQuantityFallback(String text) {
        if (text == null || text.isBlank()) return "Not detected";

        String[] lines = text.split("\\r?\\n");
        Pattern labelPattern = Pattern.compile("(?i)\\bNET\\s*[.:\\-]?(?:WT|WEIGHT|WGT|QTY|QUANTITY|CONTENTS?|CONTENT)?\\b");
        Pattern tokenPattern = Pattern.compile("(?i)(?<![a-zA-Z0-9])(\\d+(?:\\.\\d+)?)\\s*(kg|gm|gms|g|ml|litres?|litre|ltrs?|l)(?![a-zA-Z0-9])");

        // 1. Look for labeled line match
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            Matcher lm = labelPattern.matcher(line);
            if (lm.find()) {
                String sub = line.substring(lm.end());
                Matcher tm = tokenPattern.matcher(sub);
                if (tm.find()) {
                    return formatQuantity(tm.group(1), tm.group(2));
                }
                if (i + 1 < lines.length) {
                    Matcher nextTm = tokenPattern.matcher(lines[i + 1].trim());
                    if (nextTm.find()) {
                        return formatQuantity(nextTm.group(1), nextTm.group(2));
                    }
                }
            }
        }

        // 2. Unlabeled match
        List<String> candidates = new ArrayList<>();
        for (String line : lines) {
            Matcher tm = tokenPattern.matcher(line);
            while (tm.find()) {
                double num = Double.parseDouble(tm.group(1));
                String unit = tm.group(2).toLowerCase();
                boolean plausible = false;
                if (unit.startsWith("g")) {
                    plausible = num >= 5 && num <= 50000;
                } else if (unit.equals("ml")) {
                    plausible = num >= 5 && num <= 20000;
                } else if (unit.equals("kg")) {
                    plausible = num >= 0.1 && num <= 50;
                } else if (unit.startsWith("l")) {
                    plausible = num >= 0.1 && num <= 25;
                }
                if (plausible) {
                    candidates.add(formatQuantity(tm.group(1), tm.group(2)));
                }
            }
        }

        if (candidates.size() == 1) {
            return candidates.get(0);
        }

        return "Not detected";
    }

    private String formatQuantity(String numStr, String unitStr) {
        String u = unitStr.toLowerCase();
        if (u.equals("gm") || u.equals("gms")) u = "g";
        if (u.equals("litres") || u.equals("litre") || u.equals("ltrs") || u.equals("ltr")) u = "l";
        return Double.parseDouble(numStr) + " " + u;
    }
}
