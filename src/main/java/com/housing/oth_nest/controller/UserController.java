package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.AuthResponse;
import com.housing.oth_nest.dto.RegisterRequest;
import com.housing.oth_nest.dto.UserResponseDto;
import com.housing.oth_nest.service.AuthService;
import com.housing.oth_nest.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@Tag(name = "user-controller", description = "User profiles")
public class UserController {

    private final UserService userService;
    private final AuthService authService;

    public UserController(UserService userService, AuthService authService) {
        this.userService = userService;
        this.authService = authService;
    }

    @GetMapping
    @Operation(summary = "List all users")
    public List<UserResponseDto> getUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user profile by ID")
    public UserResponseDto getUser(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a user (same as POST /auth/register)")
    public UserResponseDto createUser(@Valid @RequestBody RegisterRequest request) {
        AuthResponse auth = authService.register(request);
        return userService.getUserById(auth.getUserId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a user")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }
}
