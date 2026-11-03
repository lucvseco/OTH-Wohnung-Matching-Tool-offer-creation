package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.ChatMessageResponseDto;
import com.housing.oth_nest.dto.ChatResponseDto;
import com.housing.oth_nest.dto.SendMessageRequestDto;
import com.housing.oth_nest.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/chats")
@Tag(name = "chat-controller", description = "Endpoints for user chat messaging")
@CrossOrigin(origins = "http://localhost:5173")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get all chats for a given user")
    public List<ChatResponseDto> getUserChats(@PathVariable Long userId) {
        return chatService.getUserChats(userId);
    }

    @PostMapping("/{chatId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Send a message in a chat")
    public ChatMessageResponseDto sendMessage(
            @PathVariable Long chatId,
            @Valid @RequestBody SendMessageRequestDto request) {
        return chatService.sendMessage(chatId, request);
    }

    @PatchMapping("/{chatId}/read")
    @Operation(summary = "Mark messages from other participant as read")
    public void markMessagesAsRead(
            @PathVariable Long chatId,
            @RequestParam Long userId) {
        chatService.markMessagesAsRead(chatId, userId);
    }
}