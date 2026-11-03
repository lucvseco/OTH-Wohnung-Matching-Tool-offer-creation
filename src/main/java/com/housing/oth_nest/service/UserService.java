package com.housing.oth_nest.service;

import com.housing.oth_nest.dto.DtoMapper;
import com.housing.oth_nest.dto.UserResponseDto;
import com.housing.oth_nest.exception.ResourceNotFoundException;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserResponseDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(DtoMapper::toUserResponse)
                .toList();
    }

    public UserResponseDto getUserById(Long id) {
        User user = userRepository.findWithProfilesById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        return DtoMapper.toUserResponse(user);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found: " + id);
        }
        userRepository.deleteById(id);
    }
}
