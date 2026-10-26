package com.sih.legalmetriscan.service;

import com.sih.legalmetriscan.model.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SpatialExtractionEngine {

    public double verticalOverlap(BoundingBox a, BoundingBox b) {
        if (a == null || b == null) return 0.0;
        int hA = a.getHeight();
        int hB = b.getHeight();
        if (hA <= 0 || hB <= 0) return 0.0;

        int overlapY = Math.max(0, Math.min(a.getY1(), b.getY1()) - Math.max(a.getY0(), b.getY0()));
        int minH = Math.min(hA, hB);
        return minH > 0 ? (double) overlapY / minH : 0.0;
    }

    public boolean isSameLine(BoundingBox anchor, BoundingBox candidate) {
        if (anchor == null || candidate == null) return false;
        double vOverlap = verticalOverlap(anchor, candidate);
        if (vOverlap >= 0.40) return true;

        int hA = anchor.getHeight();
        int hB = candidate.getHeight();
        double avgH = (hA + hB) / 2.0;
        double centerA = (anchor.getY0() + anchor.getY1()) / 2.0;
        double centerC = (candidate.getY0() + candidate.getY1()) / 2.0;
        return Math.abs(centerA - centerC) <= avgH * 0.45;
    }

    public boolean isToRight(BoundingBox anchor, BoundingBox candidate) {
        if (anchor == null || candidate == null) return false;
        return candidate.getX0() >= anchor.getX0() - 5;
    }

    public int horizontalDistance(BoundingBox anchor, BoundingBox candidate) {
        if (anchor == null || candidate == null) return Integer.MAX_VALUE;
        if (candidate.getX0() >= anchor.getX1()) {
            return candidate.getX0() - anchor.getX1();
        }
        if (candidate.getX1() >= anchor.getX0()) {
            return 0; // overlapping
        }
        return anchor.getX0() - candidate.getX1();
    }

    public boolean isReasonablyClose(BoundingBox anchor, BoundingBox candidate, double maxFactor) {
        if (anchor == null || candidate == null) return false;
        int h = anchor.getHeight();
        int dist = horizontalDistance(anchor, candidate);
        int maxAllowed = (int) Math.max(h * maxFactor, 350);
        return dist >= 0 && dist <= maxAllowed;
    }

    public SpatialExtractionResult extractSpatialDeclarations(List<WordGeometry> words, List<LineGeometry> lines) {
        SpatialExtractionResult result = new SpatialExtractionResult();
        if ((words == null || words.isEmpty()) && (lines == null || lines.isEmpty())) {
            return result;
        }

        // Pattern definitions
        Pattern mrpPattern = Pattern.compile("(?i)(?:MRP|M\\.?R\\.?P|MAX(?:IMUM)?\\s*RETAIL|RS\\.?|₹)\\s*[:.\\-]?\\s*(?:₹|Rs\\.?|INR)?\\s*([0-9]+(?:\\.[0-9]{1,2})?)");
        Pattern netQtyPattern = Pattern.compile("(?i)(?:NET\\s*(?:QTY|QUANTITY|WT|WEIGHT|VOLUME|CONTENT)?|N\\.?\\s*WT\\.?)\\s*[:.\\-]?\\s*([0-9]+(?:\\.[0-9]+)?\\s*(?:kg|g|gm|gms|ml|l|ltr|pcs|units))|\\b([0-9]+(?:\\.[0-9]+)?\\s*(?:kg|g|gm|gms|ml|l|ltr))\\b");
        Pattern fssaiPattern = Pattern.compile("(?i)(?:FSSAI|LIC\\.?\\s*NO\\.?|LICENCE\\s*NO\\.?)\\s*[:.\\-]?\\s*([12]\\d{13})|\\b([12]\\d{13})\\b");
        Pattern batchPattern = Pattern.compile("(?i)(?:BATCH(?:\\s*NO)?|LOT(?:\\s*NO)?|B\\.NO)\\s*[:.\\-]?\\s*([A-Z0-9\\-]+)");
        Pattern mfgPattern = Pattern.compile("(?i)(?:MFD|MFG|PACKED|PKD|DATE\\s*OF\\s*(?:MFG|PACKING))\\s*[:.\\-]?\\s*([0-9]{1,2}[/.\\-][0-9]{1,2}[/.\\-][0-9]{2,4}|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\\s,.-]+20\\d\\d)");
        Pattern bbPattern = Pattern.compile("(?i)(?:BEST\\s*BEFORE|EXPIRY|EXP(?:\\s*DATE)?|USE\\s*BY)\\s*[:.\\-]?\\s*([0-9]{1,2}[/.\\-][0-9]{1,2}[/.\\-][0-9]{2,4}|[0-9]+\\s*(?:MONTHS|DAYS|YEARS)(?:\\s*FROM\\s*(?:MFD|MFG|PACKING))?|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\\s,.-]+20\\d\\d)");
        Pattern mfrPattern = Pattern.compile("(?i)(?:MANUFACTURED\\s*(?:BY|FOR)|MFD\\.?\\s*(?:BY|FOR)|PACKED\\s*BY)\\s*[:.\\-]?\\s*([^\\n]+)");
        Pattern ccPattern = Pattern.compile("(?i)(?:CUSTOMER\\s*CARE|CONSUMER\\s*CARE|FEEDBACK|HELPLINE|TOLL\\s*FREE)\\s*[:.\\-]?\\s*([^\\n]+)");

        // 1. Analyze Lines
        if (lines != null) {
            for (LineGeometry line : lines) {
                String text = line.getText() != null ? line.getText().trim() : "";
                if (text.isEmpty()) continue;

                // MRP
                if ("Not detected".equals(result.getMrp().getValue())) {
                    Matcher m = mrpPattern.matcher(text);
                    if (m.find()) {
                        result.setMrp(StatutoryField.detected("₹ " + m.group(1), text, "HIGH"));
                    }
                }

                // Net Quantity
                if ("Not detected".equals(result.getNetQuantity().getValue())) {
                    Matcher m = netQtyPattern.matcher(text);
                    if (m.find()) {
                        String val = m.group(1) != null ? m.group(1) : m.group(2);
                        result.setNetQuantity(StatutoryField.detected(val.trim(), text, "HIGH"));
                    }
                }

                // FSSAI
                if ("Not detected".equals(result.getFssaiNumber().getValue())) {
                    Matcher m = fssaiPattern.matcher(text);
                    if (m.find()) {
                        String lic = m.group(1) != null ? m.group(1) : m.group(2);
                        result.setFssaiNumber(StatutoryField.detected(lic, text, "HIGH"));
                        result.getFssaiLicenses().add(new FssaiLicense(lic, "UNIT-1", "MANUFACTURER", text));
                    }
                }

                // Batch
                if ("Not detected".equals(result.getBatch().getValue())) {
                    Matcher m = batchPattern.matcher(text);
                    if (m.find()) {
                        result.setBatch(StatutoryField.detected(m.group(1).trim(), text, "HIGH"));
                    }
                }

                // Manufacturing Date
                if ("Not detected".equals(result.getManufacturingDate().getValue())) {
                    Matcher m = mfgPattern.matcher(text);
                    if (m.find()) {
                        result.setManufacturingDate(StatutoryField.detected(m.group(1).trim(), text, "HIGH"));
                    }
                }

                // Best Before
                if ("Not detected".equals(result.getBestBefore().getValue())) {
                    Matcher m = bbPattern.matcher(text);
                    if (m.find()) {
                        result.setBestBefore(StatutoryField.detected(m.group(1).trim(), text, "HIGH"));
                    }
                }

                // Manufacturer
                if (result.getManufacturers().isEmpty()) {
                    Matcher m = mfrPattern.matcher(text);
                    if (m.find()) {
                        String mfrText = m.group(1).trim();
                        ManufacturerInfo info = new ManufacturerInfo(mfrText, mfrText, text, "HIGH", "MANUFACTURER");
                        result.getManufacturers().add(info);
                    }
                }

                // Customer Care
                if ("Not detected".equals(result.getCustomerCare().getValue())) {
                    Matcher m = ccPattern.matcher(text);
                    if (m.find()) {
                        result.setCustomerCare(StatutoryField.detected(m.group(1).trim(), text, "HIGH"));
                    }
                }
            }
        }

        // 2. Spatial 2D Word Raycasting for unextracted fields
        if (words != null && !words.isEmpty()) {
            for (int i = 0; i < words.size(); i++) {
                WordGeometry word = words.get(i);
                String upper = word.getText() != null ? word.getText().toUpperCase() : "";

                // Look for anchor tokens
                if ("Not detected".equals(result.getMrp().getValue()) && (upper.contains("MRP") || upper.contains("RS") || upper.contains("₹"))) {
                    // Look for closest number token to the right on the same line
                    for (int j = 0; j < words.size(); j++) {
                        if (i == j) continue;
                        WordGeometry candidate = words.get(j);
                        if (isSameLine(word.getBbox(), candidate.getBbox()) && isToRight(word.getBbox(), candidate.getBbox()) && isReasonablyClose(word.getBbox(), candidate.getBbox(), 10)) {
                            Matcher m = Pattern.compile("([0-9]+(?:\\.[0-9]{1,2})?)").matcher(candidate.getText());
                            if (m.find()) {
                                result.setMrp(StatutoryField.detected("₹ " + m.group(1), word.getText() + " " + candidate.getText(), "HIGH"));
                                break;
                            }
                        }
                    }
                }

                if ("Not detected".equals(result.getNetQuantity().getValue()) && (upper.contains("NET") || upper.contains("WT") || upper.contains("QTY"))) {
                    for (int j = 0; j < words.size(); j++) {
                        if (i == j) continue;
                        WordGeometry candidate = words.get(j);
                        if (isSameLine(word.getBbox(), candidate.getBbox()) && isToRight(word.getBbox(), candidate.getBbox()) && isReasonablyClose(word.getBbox(), candidate.getBbox(), 10)) {
                            Matcher m = Pattern.compile("(?i)([0-9]+(?:\\.[0-9]+)?\\s*(?:g|gm|gms|kg|ml|l|ltr))").matcher(candidate.getText());
                            if (m.find()) {
                                result.setNetQuantity(StatutoryField.detected(m.group(1), word.getText() + " " + candidate.getText(), "HIGH"));
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Populate Status Map
        Map<String, String> status = result.getStatus();
        status.put("mrp", result.getMrp().getStatus());
        status.put("netQuantity", result.getNetQuantity().getStatus());
        status.put("fssaiNumber", result.getFssaiNumber().getStatus());
        status.put("manufacturers", !result.getManufacturers().isEmpty() ? "Detected" : "Not detected");
        status.put("manufacturedFor", result.getManufacturedFor() != null ? "Detected" : "Not detected");
        status.put("customerCare", result.getCustomerCare().getStatus());
        status.put("batch", result.getBatch().getStatus());
        status.put("manufacturingDate", result.getManufacturingDate().getStatus());
        status.put("bestBefore", result.getBestBefore().getStatus());

        return result;
    }
}
