package com.housing.oth_nest.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "apartment")
public class Apartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(length = 1000)
    private String description;

    private Double price; //Warmmiete
    private Double deposit; //Kaution
    private String location; //Full Address

    private Double area;
    private Double kaltmiete;
    private Double nebenkosten;
    private Double ablose;
    private Double sonstiges;

    @Enumerated(EnumType.STRING)
    private ApartmentType apartmentType;

    private Integer totalOccupants;
    private Integer malesCount = 0;
    private Integer femalesCount = 0;
    private Integer diverseCount = 0;

    // Rule Specifics stored natively as string flags ("allowed", "not-allowed", "maybe")
    private String petsPermission = "maybe";
    private String smokingPermission = "not-allowed";
    private String partiesPermission = "maybe";
    private String instrumentsPermission = "maybe";
    private String visitorsPermission = "allowed";

    @ElementCollection
    @CollectionTable(name = "apartment_photo_urls", joinColumns = @JoinColumn(name = "apartment_id"))
    @Column(name = "photo_url")
    private List<String> photoUrls;
}