package com.forme.controller;

import com.forme.model.ChatRequest;
import com.forme.model.ChatResponse;
import com.forme.model.NewsArticle;
import com.forme.service.AiService;
import com.forme.service.NewsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api")
public class NewsController {

    private final NewsService newsService;
    private final AiService aiService;

    public NewsController(NewsService newsService, AiService aiService) {
        this.newsService = newsService;
        this.aiService = aiService;
    }

    @GetMapping("/news")
    public ResponseEntity<List<NewsArticle>> getNews(@RequestParam String topic) {
        if (topic == null || topic.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Collections.emptyList());
        }
        List<NewsArticle> articles = newsService.fetchNewsForTopic(topic);
        return ResponseEntity.ok(articles);
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new ChatResponse("Please provide a message."));
        }
        String reply = aiService.chat(
                request.getMessage(),
                request.getArticleTitle(),
                request.getArticleDescription(),
                request.getLastResponse()
        );
        return ResponseEntity.ok(new ChatResponse(reply));
    }
}
