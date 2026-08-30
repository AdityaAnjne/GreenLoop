package com.greenloop.repository;

import com.greenloop.model.RetailerDistributor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RetailerDistributorRepository extends JpaRepository<RetailerDistributor, Long> {
    List<RetailerDistributor> findByRetailerId(Long retailerId);
    boolean existsByRetailerIdAndDistributorId(Long retailerId, Long distributorId);
}