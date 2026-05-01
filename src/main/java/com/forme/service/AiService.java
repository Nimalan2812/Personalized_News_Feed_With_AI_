package com.forme.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AiService {

    @Value("${forme.api.gemini.key}")
    private String geminiApiKey;

    @Value("${forme.api.gemini.url}")
    private String geminiApiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Sends a chat message to Google Gemini API with optional article context.
     * Returns the AI-generated text response.
     * Includes retry logic for rate-limit (429) errors.
     */
    public String chat(String userMessage, String articleTitle, String articleDescription, String lastResponse) {
        if ("YOUR_GEMINI_API_KEY".equals(geminiApiKey) || geminiApiKey == null || geminiApiKey.isEmpty()) {
            return "⚠️ AI Assistant is not configured. Please add your Gemini API key in application.properties.";
        }

        // Retry up to 5 times for rate-limit errors
        int maxRetries = 5;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String result = callGeminiApi(userMessage, articleTitle, articleDescription, lastResponse);
                if (result != null) {
                    return result;
                }
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode().value() == 429) {
                    System.err.println("Rate limited by Gemini (attempt " + attempt + "/" + maxRetries + "). Waiting before retry...");
                    if (attempt < maxRetries) {
                        try {
                            // Wait longer each time (3s, 6s, 9s...)
                            Thread.sleep(3000L * attempt);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            return "Sorry, the request was interrupted. Please try again.";
                        }
                    } else {
                        return "🕐 The AI service is currently at its limit for free users. Please wait about 30 seconds and try your request again.";
                    }
                } else if (e.getStatusCode().value() == 400) {
                    System.err.println("Bad request to Gemini API: " + e.getResponseBodyAsString());
                    return "⚠️ There was an issue with the request. Please try rephrasing your question.";
                } else if (e.getStatusCode().value() == 403) {
                    System.err.println("Gemini API key unauthorized: " + e.getResponseBodyAsString());
                    return "⚠️ The API key is invalid or doesn't have permission. Please check your Gemini API key in application.properties.";
                } else {
                    System.err.println("Gemini API error (" + e.getStatusCode() + "): " + e.getResponseBodyAsString());
                    return "⚠️ AI service error. Please try again later.";
                }
            } catch (HttpServerErrorException e) {
                System.err.println("Gemini server error: " + e.getResponseBodyAsString());
                return "⚠️ The AI service is experiencing issues. Please try again later.";
            } catch (Exception e) {
                System.err.println("Error calling Gemini API: " + e.getMessage());
                return "⚠️ Could not connect to the AI service. Please check your internet connection.";
            }
        }

        return "🕐 The AI service is temporarily busy. Please wait a moment and try again.";
    }

    private String callGeminiApi(String userMessage, String articleTitle, String articleDescription, String lastResponse) {
        String url = geminiApiUrl + "?key=" + geminiApiKey;

        // Build system instruction
        String systemPrompt = "You are ForME AI Assistant — a helpful, friendly news companion. "
                + "Your job is to help users understand news articles, explain complex topics in simple beginner-friendly language, "
                + "and translate content when asked. "
                + "When translating, provide only the translation itself without extra conversational filler. "
                + "If the user asks to 'translate the last response' or similar, look at the provided [Last AI Response] context. "
                + "For Tamil translations, ensure you use modern, clear Tamil script.";

        // Build the user prompt with article context if available
        StringBuilder fullPrompt = new StringBuilder();
        if (articleTitle != null && !articleTitle.isEmpty()) {
            fullPrompt.append("[Article Context]\n");
            fullPrompt.append("Title: ").append(articleTitle).append("\n");
            if (articleDescription != null && !articleDescription.isEmpty()) {
                fullPrompt.append("Description: ").append(articleDescription).append("\n");
            }
            fullPrompt.append("\n[User Question]\n");
        }

        if (lastResponse != null && !lastResponse.isEmpty()) {
            fullPrompt.append("[Last AI Response Context]\n");
            fullPrompt.append(lastResponse).append("\n\n");
        }
        fullPrompt.append(userMessage);

        // Build Gemini API request body
        Map<String, Object> requestBody = new HashMap<>();

        // System instruction
        Map<String, Object> systemInstruction = new HashMap<>();
        Map<String, String> systemPart = new HashMap<>();
        systemPart.put("text", systemPrompt);
        systemInstruction.put("parts", Collections.singletonList(systemPart));
        requestBody.put("system_instruction", systemInstruction);

        // User content
        Map<String, Object> userContent = new HashMap<>();
        userContent.put("role", "user");
        Map<String, String> userPart = new HashMap<>();
        userPart.put("text", fullPrompt.toString());
        userContent.put("parts", Collections.singletonList(userPart));
        requestBody.put("contents", Collections.singletonList(userContent));

        // Generation config
        Map<String, Object> genConfig = new HashMap<>();
        genConfig.put("temperature", 0.7);
        genConfig.put("maxOutputTokens", 1024);
        requestBody.put("generationConfig", genConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            try {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    JsonNode content = candidates.get(0).path("content");
                    JsonNode parts = content.path("parts");
                    if (parts.isArray() && parts.size() > 0) {
                        return parts.get(0).path("text").asText();
                    }
                }
            } catch (Exception e) {
                System.err.println("Error parsing Gemini response: " + e.getMessage());
            }
        }

        return "Sorry, I couldn't generate a response. Please try again.";
    }
}
