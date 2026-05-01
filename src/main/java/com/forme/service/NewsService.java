package com.forme.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.forme.model.NewsArticle;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
public class NewsService {

    @Value("${forme.api.news.url}")
    private String newsApiUrl;

    @Value("${forme.api.news.key}")
    private String newsApiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public NewsService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper();
    }

    public List<NewsArticle> fetchNewsForTopic(String topic) {
        List<NewsArticle> articles = new ArrayList<>();

        if ("YOUR_NEWS_API_KEY".equals(newsApiKey) || newsApiKey.isEmpty()) {
            System.err.println("WARNING: News API key not set. Returning mock data.");
            return getMockNews(topic);
        }

        try {
            // Enclose the topic in quotes to ensure an exact phrase match for better relevancy.
            // Using q ensures the exact topic phrase is found in the article (title, description, or content).
            String exactTopic = "\"" + topic + "\"";
            String url = newsApiUrl + "?q={topic}&language=en&sortBy=relevancy&pageSize=15&apiKey={apiKey}";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class, exactTopic, newsApiKey);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode rootNode = objectMapper.readTree(response.getBody());
                JsonNode articlesNode = rootNode.path("articles");
                
                if (articlesNode.isArray()) {
                    for (JsonNode node : articlesNode) {
                        NewsArticle article = new NewsArticle();
                        article.setTitle(node.path("title").asText());
                        article.setDescription(node.path("description").asText());
                        article.setUrlToImage(node.path("urlToImage").asText());
                        article.setContent(node.path("content").asText());
                        article.setUrl(node.path("url").asText());
                        
                        // Ignore articles removed or with missing crucial info
                        if (!"[Removed]".equals(article.getTitle()) && article.getUrlToImage() != null && !article.getUrlToImage().isEmpty() && !"null".equals(article.getUrlToImage())) {
                             articles.add(article);
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching news from API: " + e.getMessage());
            // Fallback for demonstration
            return getMockNews(topic);
        }

        return articles;
    }

    private List<NewsArticle> getMockNews(String topic) {
        List<NewsArticle> mockArticles = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            NewsArticle a = new NewsArticle();
            a.setTitle("Trending " + topic + " News " + i);
            a.setDescription("This is a mock description for the latest trend in " + topic + ".");
            // Ensure visual aesthetics with placeholder images
            a.setUrlToImage("https://picsum.photos/seed/" + topic + i + "/400/250");
            mockArticles.add(a);
        }
        return mockArticles;
    }
}
