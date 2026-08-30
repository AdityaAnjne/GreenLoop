package com.greenloop.repository;

import com.greenloop.model.FarmerRetailer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FarmerRetailerRepository extends JpaRepository<FarmerRetailer, Long> {
    List<FarmerRetailer> findByFarmerId(Long farmerId);
    boolean existsByFarmerIdAndRetailerId(Long farmerId, Long retailerId);
}