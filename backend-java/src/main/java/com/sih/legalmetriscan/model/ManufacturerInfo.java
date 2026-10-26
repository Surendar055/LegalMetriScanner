package com.sih.legalmetriscan.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ManufacturerInfo {
    private String company;
    private String address;
    private String source;
    private String confidence;
    private String role; // "MANUFACTURER" | "PACKER" | "MARKETER" | "MANUFACTURED_FOR"

    public ManufacturerInfo() {}

    public ManufacturerInfo(String company, String address, String source, String confidence, String role) {
        this.company = company;
        this.address = address;
        this.source = source;
        this.confidence = confidence;
        this.role = role;
    }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getConfidence() { return confidence; }
    public void setConfidence(String confidence) { this.confidence = confidence; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
