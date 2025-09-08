// Automatic preprocessing optimization service
// Analyzes images and finds optimal preprocessing parameters

export class PreprocessingOptimizer {
  constructor() {
    this.optimizationPresets = {
      // Image quality analysis presets
      "high_quality": {
        blurKernel: 3,
        thresholdMethod: "Adaptive Gaussian",
        blockSize: 11,
        cValue: 2,
        description: "Clear, high-contrast images"
      },
      "medium_quality": {
        blurKernel: 5,
        thresholdMethod: "Adaptive Gaussian", 
        blockSize: 15,
        cValue: 3,
        description: "Moderate quality images"
      },
      "low_quality": {
        blurKernel: 7,
        thresholdMethod: "Adaptive Mean",
        blockSize: 19,
        cValue: 5,
        description: "Blurry or noisy images"
      },
      "handwritten": {
        blurKernel: 3,
        thresholdMethod: "Adaptive Gaussian",
        blockSize: 15,
        cValue: 2,
        description: "Handwritten text"
      },
      "printed_text": {
        blurKernel: 5,
        thresholdMethod: "Adaptive Gaussian",
        blockSize: 11,
        cValue: 2,
        description: "Clear printed text"
      },
      "faded_text": {
        blurKernel: 5,
        thresholdMethod: "Adaptive Gaussian",
        blockSize: 15,
        cValue: 6,
        description: "Faded or old documents"
      }
    };
  }

  // Analyze image characteristics to determine optimal settings
  async analyzeImage(imageFile) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const analysis = this.analyzeImageData(imageData);
        
        resolve({
          ...analysis,
          dimensions: { width: img.width, height: img.height },
          fileSize: imageFile.size
        });
      };
      img.src = URL.createObjectURL(imageFile);
    });
  }

  // Analyze image data to determine characteristics
  analyzeImageData(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let totalBrightness = 0;
    let totalContrast = 0;
    let edgeCount = 0;
    let noiseLevel = 0;
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      
      // Calculate contrast (simplified)
      if (i > 0) {
        const prevBrightness = (data[i - 4] + data[i - 3] + data[i - 2]) / 3;
        totalContrast += Math.abs(brightness - prevBrightness);
      }
    }
    
    const avgBrightness = totalBrightness / (data.length / 16);
    const avgContrast = totalContrast / (data.length / 16);
    
    // Determine image characteristics
    const characteristics = {
      brightness: avgBrightness,
      contrast: avgContrast,
      quality: this.determineQuality(avgBrightness, avgContrast),
      type: this.determineImageType(avgBrightness, avgContrast)
    };
    
    return characteristics;
  }

  // Determine image quality based on brightness and contrast
  determineQuality(brightness, contrast) {
    if (contrast > 50 && brightness > 100 && brightness < 200) {
      return "high";
    } else if (contrast > 30 && brightness > 80 && brightness < 220) {
      return "medium";
    } else {
      return "low";
    }
  }

  // Determine image type based on characteristics
  determineImageType(brightness, contrast) {
    if (contrast < 30) {
      return "faded_text";
    } else if (brightness < 100) {
      return "low_quality";
    } else if (brightness > 200) {
      return "high_quality";
    } else {
      return "medium_quality";
    }
  }

  // Get optimal preprocessing settings based on analysis
  getOptimalSettings(analysis) {
    const preset = this.optimizationPresets[analysis.type] || this.optimizationPresets["medium_quality"];
    
    // Fine-tune based on quality
    let settings = { ...preset };
    
    if (analysis.quality === "high") {
      settings.blurKernel = Math.max(3, settings.blurKernel - 2);
      settings.cValue = Math.max(1, settings.cValue - 1);
    } else if (analysis.quality === "low") {
      settings.blurKernel = Math.min(15, settings.blurKernel + 2);
      settings.cValue = Math.min(10, settings.cValue + 2);
    }
    
    return {
      settings,
      confidence: this.calculateConfidence(analysis),
      reasoning: this.getReasoning(analysis, settings)
    };
  }

  // Calculate confidence in the recommended settings
  calculateConfidence(analysis) {
    let confidence = 0.7; // Base confidence
    
    // Higher confidence for extreme cases
    if (analysis.quality === "high" || analysis.quality === "low") {
      confidence += 0.2;
    }
    
    // Higher confidence for clear image types
    if (analysis.type === "high_quality" || analysis.type === "printed_text") {
      confidence += 0.1;
    }
    
    return Math.min(0.95, confidence);
  }

  // Get reasoning for the recommended settings
  getReasoning(analysis, settings) {
    const reasons = [];
    
    if (analysis.quality === "high") {
      reasons.push("High-quality image detected - using minimal blur");
    } else if (analysis.quality === "low") {
      reasons.push("Low-quality image detected - using stronger noise reduction");
    }
    
    if (analysis.type === "faded_text") {
      reasons.push("Faded text detected - using higher C value for better contrast");
    } else if (analysis.type === "handwritten") {
      reasons.push("Handwritten text detected - using larger block size");
    }
    
    if (settings.blurKernel > 5) {
      reasons.push(`Blur kernel ${settings.blurKernel} for noise reduction`);
    }
    
    if (settings.cValue > 3) {
      reasons.push(`C value ${settings.cValue} for enhanced contrast`);
    }
    
    return reasons.join("; ");
  }

  // Test multiple settings and find the best one
  async findOptimalSettings(imageFile, ocrAPI) {
    const analysis = await this.analyzeImage(imageFile);
    const recommendation = this.getOptimalSettings(analysis);
    
    // Test the recommended settings
    const testSettings = [
      recommendation.settings,
      // Test a few variations
      { ...recommendation.settings, blurKernel: recommendation.settings.blurKernel + 2 },
      { ...recommendation.settings, cValue: recommendation.settings.cValue + 1 },
      { ...recommendation.settings, thresholdMethod: "Adaptive Mean" }
    ];
    
    const results = [];
    
    for (const settings of testSettings) {
      try {
        const result = await ocrAPI.preprocessImage(imageFile, settings);
        if (result.success) {
          // Quick OCR test to evaluate quality
          const ocrResult = await ocrAPI.extractText(imageFile, {
            ocrType: "tesseract",
            usePreprocessing: true,
            ...settings
          });
          
          results.push({
            settings,
            confidence: ocrResult.confidence,
            textLength: ocrResult.text.length,
            quality: this.evaluateOCRQuality(ocrResult.text)
          });
        }
      } catch (error) {
        console.warn("Settings test failed:", error);
      }
    }
    
    // Find the best result
    const bestResult = results.reduce((best, current) => {
      const currentScore = current.confidence * 0.7 + current.quality * 0.3;
      const bestScore = best.confidence * 0.7 + best.quality * 0.3;
      return currentScore > bestScore ? current : best;
    }, results[0]);
    
    return {
      optimalSettings: bestResult?.settings || recommendation.settings,
      confidence: bestResult?.confidence || recommendation.confidence,
      reasoning: recommendation.reasoning,
      analysis,
      testedSettings: results
    };
  }

  // Evaluate OCR text quality
  evaluateOCRQuality(text) {
    if (!text || text.length < 10) return 0.1;
    
    // Simple heuristics for text quality
    const wordCount = text.split(/\s+/).length;
    const avgWordLength = text.length / wordCount;
    const hasNumbers = /\d/.test(text);
    const hasPunctuation = /[.,!?;:]/.test(text);
    
    let quality = 0.5; // Base quality
    
    if (avgWordLength > 3 && avgWordLength < 8) quality += 0.2;
    if (hasNumbers) quality += 0.1;
    if (hasPunctuation) quality += 0.1;
    if (wordCount > 5) quality += 0.1;
    
    return Math.min(1.0, quality);
  }
}

export default PreprocessingOptimizer;
