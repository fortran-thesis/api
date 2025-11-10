# Gemini Cultivation Log Analysis Endpoint

## Overview
This endpoint uses Google's Gemini 2.0 Flash model to analyze cultivation images and extract specific characteristics based on the cultivation type (in vivo or in vitro).

## Endpoint
```
POST /api/v1/mold-cases/:id/analyze-cultivation
```

## Authentication
Requires authentication via Bearer token or session cookie.

## Request

### Headers
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Body (multipart/form-data)
- `image` (file, required): The cultivation image to analyze (JPEG/PNG, max 10MB)
- `type` (string, required): Cultivation type - either `"vivo"` or `"vitro"`

### Example Request
```bash
curl -X POST "https://your-api.com/api/v1/mold-cases/abc123/analyze-cultivation" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@cultivation_photo.jpg" \
  -F "type=vivo"
```

## Response

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "type": "vivo",
    "characteristics": {
      "lesion_size": 15,
      "lesion_color": "dark brown with yellow edges"
    },
    "additional_info": "Lesion shows concentric rings with necrotic center, typical of fungal infection progression",
    "confidence": "high"
  }
}
```

**For in vitro (vitro type):**
```json
{
  "success": true,
  "data": {
    "type": "vitro",
    "characteristics": {
      "colony_diameter": 45,
      "colony_color": "white with green spores in center"
    },
    "additional_info": "Colony shows cottony texture with abundant sporulation in the center",
    "confidence": "high"
  }
}
```

### Unrecognizable Image Response
```json
{
  "success": true,
  "data": {
    "type": "vivo",
    "characteristics": {
      "lesion_size": 0,
      "lesion_color": "unrecognizable"
    },
    "additional_info": "Image quality insufficient or does not show clear mold lesion",
    "confidence": "low"
  }
}
```

### Error Responses

**400 - Invalid Cultivation Type**
```json
{
  "success": false,
  "error": "Invalid cultivation type. Must be 'vivo' or 'vitro'"
}
```

**400 - No Image Provided**
```json
{
  "success": false,
  "error": "No image file provided"
}
```

**500 - Analysis Failed**
```json
{
  "success": false,
  "error": "Failed to analyze image"
}
```

## Cultivation Types

### In Vivo (`"vivo"`)
For images of mold growing on living hosts (plants, organisms).

**Analyzed Characteristics:**
- `lesion_size`: Diameter or width of the lesion in millimeters
- `lesion_color`: Predominant color description of the lesion

### In Vitro (`"vitro"`)
For images of mold growing in petri dishes or culture media.

**Analyzed Characteristics:**
- `colony_diameter`: Diameter of the colony in millimeters
- `colony_color`: Predominant color description of the colony

## AI Analysis Details

The endpoint uses Gemini 2.0 Flash Experimental model with specialized prompts:

- **Model**: `gemini-2.0-flash-exp`
- **Analysis Focus**: Only the two key characteristics per cultivation type
- **Confidence Levels**: `high`, `medium`, `low`
- **Fallback**: Returns "unrecognizable" for unclear or invalid images

## Environment Setup

Ensure the following environment variable is set:

```env
GEMINI_CULTIVATION_LOG_API_KEY=your_gemini_api_key_here
```

## Integration with Mobile App

The mobile app should:
1. Capture or select a cultivation image
2. Determine the cultivation type (vivo or vitro) based on the mold case
3. Send multipart/form-data request with `image` and `type` fields
4. Parse the response and display or auto-fill the cultivation log characteristics
5. Allow the mycologist to review and edit before saving

## Notes

- Image should be clear and well-lit for best results
- Supported formats: JPEG, PNG
- Max file size: 10MB
- The AI provides a starting point - mycologists should verify and adjust as needed
- The `additional_info` field provides context about the AI's observations
