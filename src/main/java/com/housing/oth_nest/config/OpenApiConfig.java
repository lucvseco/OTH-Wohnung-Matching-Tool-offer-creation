package com.housing.oth_nest.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI othNestOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("OTH Nest API")
                        .description("University housing marketplace API (WG-Gesucht style)")
                        .version("1.0"));
    }
}
