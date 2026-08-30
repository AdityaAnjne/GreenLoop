package com.greenloop.model;

import jakarta.persistence.*;

@Entity
@Table(name = "retailer_distributors", uniqueConstraints = @UniqueConstraint(columnNames = {"retailer_id", "distributor_id"}))
public class RetailerDistributor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "retailer_id", nullable = false)
    private Long retailerId;

    @Column(name = "distributor_id", nullable = false)
    private Long distributorId;

    public RetailerDistributor() {}
    public RetailerDistributor(Long retailerId, Long distributorId) {
        this.retailerId = retailerId;
        this.distributorId = distributorId;
    }

    public Long getId() { return id; }
    public Long getRetailerId() { return retailerId; }
    public void setRetailerId(Long retailerId) { this.retailerId = retailerId; }
    public Long getDistributorId() { return distributorId; }
    public void setDistributorId(Long distributorId) { this.distributorId = distributorId; }
}