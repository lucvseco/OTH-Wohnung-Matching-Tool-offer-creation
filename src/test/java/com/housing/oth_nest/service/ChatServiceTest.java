package com.housing.oth_nest.service;

import com.housing.oth_nest.dto.SendMessageRequestDto;
import com.housing.oth_nest.exception.BadRequestException;
import com.housing.oth_nest.model.Application;
import com.housing.oth_nest.model.ApplicationStatus;
import com.housing.oth_nest.model.Chat;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.repository.ApplicationRepository;
import com.housing.oth_nest.repository.ChatMessageRepository;
import com.housing.oth_nest.repository.ChatRepository;
import com.housing.oth_nest.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatRepository chatRepository;
    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private ApplicationRepository applicationRepository;
    @Mock
    private UserRepository userRepository;
    @InjectMocks
    private ChatService chatService;

    private final User owner = User.builder().id(2L).name("Anna Schmidt").build();
    private final User applicant = User.builder().id(1L).name("Max Mustermann").build();

    private void givenChat(ApplicationStatus status) {
        Application application = Application.builder().id(5L).status(status).build();
        Chat chat = Chat.builder().id(10L).owner(owner).applicant(applicant).application(application).build();
        when(chatRepository.findById(10L)).thenReturn(Optional.of(chat));
    }

    private static SendMessageRequestDto message(Long senderId) {
        SendMessageRequestDto request = new SendMessageRequestDto();
        request.setSenderId(senderId);
        request.setContent("When can I visit the room?");
        return request;
    }

    @Test
    void outsiderCannotWriteInSomeoneElsesChat() {
        givenChat(ApplicationStatus.APPROVED);
        when(userRepository.findById(3L)).thenReturn(Optional.of(User.builder().id(3L).name("Outsider").build()));

        assertThatThrownBy(() -> chatService.sendMessage(10L, message(3L)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("not a participant");
        verify(chatMessageRepository, never()).save(any());
    }

    @Test
    void nobodyCanWriteInAClosedChat() {
        givenChat(ApplicationStatus.DECLINED);

        assertThatThrownBy(() -> chatService.sendMessage(10L, message(1L)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("closed");
        verify(chatMessageRepository, never()).save(any());
    }

    @Test
    void bothParticipantsCanWrite() {
        givenChat(ApplicationStatus.APPROVED);
        when(userRepository.findById(1L)).thenReturn(Optional.of(applicant));
        when(userRepository.findById(2L)).thenReturn(Optional.of(owner));
        when(chatMessageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(chatService.sendMessage(10L, message(1L)).getSenderId()).isEqualTo("1");
        assertThat(chatService.sendMessage(10L, message(2L)).getSenderId()).isEqualTo("2");
    }
}
