package com.sih.legalmetriscan.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StatutoryField {
    private String value;
    private String source;
    private String confidence; // "HIGH" | "MEDIUM" | "LOW"
    private String status;     // "Detected" | "Not detected"

    public StatutoryField() {
        this.value = "Not detected";
        this.source = null;
        this.confidence = "LOW";
        this.status = "Not detected";
    }

    public StatutoryField(String value) {
        this.value = (value != null && !value.isBlank()) ? value : "Not detected";
        this.source = null;
        this.confidence = "Not detected".equalsIgnoreCase(this.value) ? "LOW" : "HIGH";
        this.status = "Not detected".equalsIgnoreCase(this.value) ? "Not detected" : "Detected";
    }

    public StatutoryField(String value, String source, String confidence) {
        this.value = (value != null && !value.isBlank()) ? value : "Not detected";
        this.source = source;
        this.confidence = confidence != null ? confidence.toUpperCase() : "MEDIUM";
        this.status = "Not detected".equalsIgnoreCase(this.value) ? "Not detected" : "Detected";
    }

    public StatutoryField(String value, String source, String confidence, String status) {
        this.value = (value != null && !value.isBlank()) ? value : "Not detected";
        this.source = source;
        this.confidence = confidence != null ? confidence.toUpperCase() : "MEDIUM";
        this.status = status != null ? status : ("Not detected".equalsIgnoreCase(this.value) ? "Not detected" : "Detected");
    }

    public static StatutoryField notDetected() {
        return new StatutoryField("Not detected", null, "LOW", "Not detected");
    }

    public static StatutoryField detected(String value, String source, String confidence) {
        return new StatutoryField(value, source, confidence, "Detected");
    }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getConfidence() { return confidence; }
    public void setConfidence(String confidence) { this.confidence = confidence; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    @Override
    public String toString() {
        return value;
    }
}
