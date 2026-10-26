package com.sih.legalmetriscan.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.*;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class SpatialExtractionResult {
    private StatutoryField mrp = StatutoryField.notDetected();
    private StatutoryField netQuantity = StatutoryField.notDetected();
    private StatutoryField fssaiNumber = StatutoryField.notDetected();
    private List<FssaiLicense> fssaiLicenses = new ArrayList<>();
    private List<ManufacturerInfo> manufacturers = new ArrayList<>();
    private ManufacturerInfo manufacturedFor = null;
    private List<ManufacturerInfo> packers = new ArrayList<>();
    private List<ManufacturerInfo> marketers = new ArrayList<>();
    private StatutoryField customerCare = StatutoryField.notDetected();
    private StatutoryField batch = StatutoryField.notDetected();
    private StatutoryField manufacturingDate = StatutoryField.notDetected();
    private StatutoryField bestBefore = StatutoryField.notDetected();
    private Map<String, Object> debug = new LinkedHashMap<>();
    private Map<String, String> status = new LinkedHashMap<>();

    public SpatialExtractionResult() {}

    public StatutoryField getMrp() { return mrp; }
    public void setMrp(StatutoryField mrp) { this.mrp = mrp; }

    public StatutoryField getNetQuantity() { return netQuantity; }
    public void setNetQuantity(StatutoryField netQuantity) { this.netQuantity = netQuantity; }

    public StatutoryField getFssaiNumber() { return fssaiNumber; }
    public void setFssaiNumber(StatutoryField fssaiNumber) { this.fssaiNumber = fssaiNumber; }

    public List<FssaiLicense> getFssaiLicenses() { return fssaiLicenses; }
    public void setFssaiLicenses(List<FssaiLicense> fssaiLicenses) { this.fssaiLicenses = fssaiLicenses; }

    public List<ManufacturerInfo> getManufacturers() { return manufacturers; }
    public void setManufacturers(List<ManufacturerInfo> manufacturers) { this.manufacturers = manufacturers; }

    public ManufacturerInfo getManufacturedFor() { return manufacturedFor; }
    public void setManufacturedFor(ManufacturerInfo manufacturedFor) { this.manufacturedFor = manufacturedFor; }

    public List<ManufacturerInfo> getPackers() { return packers; }
    public void setPackers(List<ManufacturerInfo> packers) { this.packers = packers; }

    public List<ManufacturerInfo> getMarketers() { return marketers; }
    public void setMarketers(List<ManufacturerInfo> marketers) { this.marketers = marketers; }

    public StatutoryField getCustomerCare() { return customerCare; }
    public void setCustomerCare(StatutoryField customerCare) { this.customerCare = customerCare; }

    public StatutoryField getBatch() { return batch; }
    public void setBatch(StatutoryField batch) { this.batch = batch; }

    public StatutoryField getManufacturingDate() { return manufacturingDate; }
    public void setManufacturingDate(StatutoryField manufacturingDate) { this.manufacturingDate = manufacturingDate; }

    public StatutoryField getBestBefore() { return bestBefore; }
    public void setBestBefore(StatutoryField bestBefore) { this.bestBefore = bestBefore; }

    public Map<String, Object> getDebug() { return debug; }
    public void setDebug(Map<String, Object> debug) { this.debug = debug; }

    public Map<String, String> getStatus() { return status; }
    public void setStatus(Map<String, String> status) { this.status = status; }
}
