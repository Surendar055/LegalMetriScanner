package com.sih.legalmetriscan.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class FssaiLicense {
    private String licenseNumber;
    private String unitCode;
    private String role;
    private String source;

    public FssaiLicense() {}

    public FssaiLicense(String licenseNumber, String unitCode, String role, String source) {
        this.licenseNumber = licenseNumber;
        this.unitCode = unitCode;
        this.role = role;
        this.source = source;
    }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public String getUnitCode() { return unitCode; }
    public void setUnitCode(String unitCode) { this.unitCode = unitCode; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
