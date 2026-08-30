package com.greenloop.model;

import jakarta.persistence.*;

@Entity
@Table(name = "farmer_retailers", uniqueConstraints = @UniqueConstraint(columnNames = {"farmer_id", "retailer_id"}))
public class FarmerRetailer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;

    @Column(name = "retailer_id", nullable = false)
    private Long retailerId;

    public FarmerRetailer() {}
    public FarmerRetailer(Long farmerId, Long retailerId) {
        this.farmerId = farmerId;
        this.retailerId = retailerId;
    }

    public Long getId() { return id; }
    public Long getFarmerId() { return farmerId; }
    public void setFarmerId(Long farmerId) { this.farmerId = farmerId; }
    public Long getRetailerId() { return retailerId; }
    public void setRetailerId(Long retailerId) { this.retailerId = retailerId; }
}