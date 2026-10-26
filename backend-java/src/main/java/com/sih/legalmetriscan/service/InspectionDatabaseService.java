package com.sih.legalmetriscan.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.legalmetriscan.model.InspectionRecord;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class InspectionDatabaseService {

    private final List<InspectionRecord> records = new CopyOnWriteArrayList<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final File dbFile = new File("scratch/inspections_database.json");

    @PostConstruct
    public void init() {
        try {
            if (dbFile.exists() && dbFile.length() > 0) {
                List<InspectionRecord> saved = objectMapper.readValue(dbFile, new TypeReference<>() {});
                if (saved != null && !saved.isEmpty()) {
                    records.addAll(saved);
                    System.out.println("[InspectionDatabaseService] Loaded " + records.size() + " items from " + dbFile.getPath());
                }
            }
        } catch (Exception e) {
            System.err.println("[InspectionDatabaseService] Notice: could not load existing inspections: " + e.getMessage());
        }
    }

    public List<InspectionRecord> getAll() {
        return Collections.unmodifiableList(records);
    }

    public Optional<InspectionRecord> getById(String id) {
        return records.stream().filter(r -> Objects.equals(r.getId(), id)).findFirst();
    }

    public synchronized InspectionRecord save(InspectionRecord record) {
        if (record.getId() == null || record.getId().isBlank()) {
            record.setId("SCAN-" + (records.size() + 1));
        }

        // Ensure statutory compliance validation:
        // An inspection must NEVER be marked "Compliant" merely because fields were not detected.
        if (record.getStatus() == null || record.getStatus().isBlank() || "Compliant".equalsIgnoreCase(record.getStatus())) {
            boolean hasMissing = false;
            if (record.getDetails() != null) {
                for (String key : List.of("mrp", "netQuantity", "manufacturer", "manufacturingDate", "customerCare")) {
                    Object val = record.getDetails().get(key);
                    if (val == null || "Not detected".equalsIgnoreCase(val.toString()) || val.toString().contains("Not detected")) {
                        hasMissing = true;
                        break;
                    }
                }
            }
            if (record.getVerdict() != null && (record.getVerdict().toLowerCase().contains("missing") || record.getVerdict().toLowerCase().contains("potential issue"))) {
                hasMissing = true;
            }
            if (hasMissing) {
                record.setStatus("Attention Required");
            } else if (record.getStatus() == null || record.getStatus().isBlank()) {
                record.setStatus("Compliant");
            }
        }

        records.removeIf(r -> Objects.equals(r.getId(), record.getId()));
        records.add(0, record);

        // Persist to disk
        try {
            File scratchDir = new File("scratch");
            if (!scratchDir.exists()) scratchDir.mkdirs();
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(dbFile, records);
        } catch (Exception e) {
            System.err.println("[InspectionDatabaseService] Error saving database file: " + e.getMessage());
        }

        return record;
    }

    public String exportCsv() {
        StringBuilder csv = new StringBuilder();
        csv.append("Inspection ID,Date & Time,Product Name,Barcode,Category,Status,Verdict\r\n");

        for (InspectionRecord r : records) {
            String pName = r.getProductName() != null ? r.getProductName().toString().replace("\"", "\"\"") : "Scanned Package";
            csv.append("\"").append(r.getId() != null ? r.getId() : "").append("\",");
            csv.append("\"").append(r.getDisplayDate() != null ? r.getDisplayDate() : r.getTimestamp()).append("\",");
            csv.append("\"").append(pName).append("\",");
            csv.append("\"").append(r.getBarcode() != null ? r.getBarcode() : "N/A").append("\",");
            csv.append("\"").append(r.getCategory() != null ? r.getCategory() : "Packaged Commodity").append("\",");
            csv.append("\"").append(r.getStatus() != null ? r.getStatus() : "Compliant").append("\",");
            csv.append("\"").append(r.getVerdict() != null ? r.getVerdict().replace("\"", "\"\"") : "").append("\"\r\n");
        }

        return csv.toString();
    }
}
