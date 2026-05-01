# ForME – Personalized News Feed with AI Assistant

ForME is a full-stack personalized news application. It allows you to select topics of interest and see trending news. It includes an integrated AI Assistant that can explain complex news articles in simple, beginner-friendly terms.

## Features
- **Topic Management (ForME Folder):** Add and remove personal topics (e.g., AI, Sports, Finance).
- **Real-Time News Fetching:** Gets the latest related news from the NewsAPI aggregator.
- **Deep Dive News:** Instantly preview the content and navigate directly to the original publisher's website to read the full story.
- **Modern User Experience:** Beautiful card-based layout, dark mode, loading indicators, and clean animations.

## Tech Stack
- **Backend:** Java, Spring Boot (REST APIs).
- **Frontend:** HTML5, CSS3 (Modern Vanilla CSS), JavaScript.
- **APIs Used:** NewsAPI for articles, OpenAI-compatible API for Generation.

## Setup Instructions

### Prerequisites
1. Java Development Kit (JDK) 17+ installed.
2. Maven installed.
3. Obtain API keys:
   - **NewsAPI Key:** Go to [NewsAPI.org](https://newsapi.org/) and create a free account to get an API key.
   - **AI API Key:** You can use a Google Gemini API Key. 

### Step 1: Configure API Keys
You have two options to configure your API keys:

#### Option A: Use Environment Variables (Recommended)
Set the following environment variables on your system:
- `NEWS_API_KEY`: Your NewsAPI key.
- `GEMINI_API_KEY`: Your Google Gemini API key.

#### Option B: Local Properties File
1. Copy `src/main/resources/application.properties.example` to `src/main/resources/application.properties`.
2. Open `src/main/resources/application.properties` and replace the placeholders with your actual keys.
3. *Note: `application.properties` is ignored by Git to prevent your keys from being shared.*

*Note: If you run the app without changing keys, it will fallback to displaying mock data so you can test the UI.*

### Step 2: Run the Application
1. Open your terminal in the project root directory.
2. Build and run via Maven Wrapper or standard Maven:
   ```bash
   mvn spring-boot:run
   ```
3. The server will start on port 8080.

### Step 3: Use the Application
1. Open your browser and navigate to `http://localhost:8080/`.
2. Add topics to your **ForME Folder**.
3. View the generated news feed.
4. Click **✨ Explain More** on an article to trigger the AI Assistant!

## Folder Structure
```
d:/PROJECT1/
├── pom.xml
├── README.md
└── src/
    └── main/
        ├── java/com/forme/
        │   ├── ForMeApplication.java
        │   ├── controller/NewsController.java
        │   ├── model/
        │   │   ├── ChatRequest.java
        │   │   ├── ChatResponse.java
        │   │   └── NewsArticle.java
        │   └── service/
        │       ├── AiService.java
        │       └── NewsService.java
        └── resources/
            ├── application.properties
            └── static/
                ├── index.html
                ├── style.css
                └── script.js
```
