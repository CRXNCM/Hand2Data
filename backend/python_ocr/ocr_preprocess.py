import cv2
import numpy as np
import tkinter as tk
from tkinter import ttk, filedialog, Scale, scrolledtext
from PIL import Image, ImageTk
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

class OCRPreprocessorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Handwritten OCR Image Preprocessing with TrOCR")
        self.root.geometry("1300x800")
        
        # Initialize variables
        self.image_path = None
        self.original_image = None
        self.gray_image = None
        self.blurred_image = None
        self.thresh_image = None
        self.extracted_text = ""
        
        # Default parameters
        self.blur_kernel_size = tk.IntVar(value=5)
        self.threshold_method = tk.StringVar(value="Adaptive Gaussian")
        self.block_size = tk.IntVar(value=11)
        self.c_value = tk.IntVar(value=2)
        self.simple_thresh_value = tk.IntVar(value=127)
        
        # Initialize TrOCR model
        self.status_var = tk.StringVar(value="Loading TrOCR model... This may take a moment.")
        self.load_trocr_model()
        
        self.create_widgets()
        
    def load_trocr_model(self):
        try:
            # Load TrOCR processor and model with fast processor
            self.processor = TrOCRProcessor.from_pretrained("microsoft/trocr-large-handwritten", use_fast=True)
            self.model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-large-handwritten")
            
            # Move model to GPU if available
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
            
            self.status_var.set(f"TrOCR model loaded successfully. Using device: {self.device}")
        except Exception as e:
            self.status_var.set(f"Error loading TrOCR model: {str(e)}")

        
    def create_widgets(self):
        # Main frame
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Left panel for controls
        control_frame = ttk.LabelFrame(main_frame, text="Controls")
        control_frame.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        
        # Load image button
        load_btn = ttk.Button(control_frame, text="Load Image", command=self.load_image)
        load_btn.pack(fill=tk.X, padx=5, pady=5)
        
        # Separator
        ttk.Separator(control_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, padx=5, pady=10)
        
        # Blur controls
        blur_frame = ttk.LabelFrame(control_frame, text="Blur Settings")
        blur_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(blur_frame, text="Kernel Size:").pack(anchor=tk.W, padx=5, pady=2)
        blur_scale = Scale(blur_frame, from_=1, to=15, resolution=2, orient=tk.HORIZONTAL,
                          variable=self.blur_kernel_size, command=self.update_processing)
        blur_scale.pack(fill=tk.X, padx=5, pady=2)
        
        # Threshold controls
        thresh_frame = ttk.LabelFrame(control_frame, text="Threshold Settings")
        thresh_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(thresh_frame, text="Method:").pack(anchor=tk.W, padx=5, pady=2)
        methods = ["Adaptive Gaussian", "Adaptive Mean", "Otsu", "Simple"]
        method_menu = ttk.Combobox(thresh_frame, textvariable=self.threshold_method, values=methods)
        method_menu.pack(fill=tk.X, padx=5, pady=2)
        method_menu.bind("<<ComboboxSelected>>", self.update_processing)
        
        ttk.Label(thresh_frame, text="Block Size:").pack(anchor=tk.W, padx=5, pady=2)
        block_scale = Scale(thresh_frame, from_=3, to=99, resolution=2, orient=tk.HORIZONTAL,
                           variable=self.block_size, command=self.update_processing)
        block_scale.pack(fill=tk.X, padx=5, pady=2)
        
        ttk.Label(thresh_frame, text="C Value:").pack(anchor=tk.W, padx=5, pady=2)
        c_scale = Scale(thresh_frame, from_=-10, to=10, orient=tk.HORIZONTAL,
                       variable=self.c_value, command=self.update_processing)
        c_scale.pack(fill=tk.X, padx=5, pady=2)
        
        ttk.Label(thresh_frame, text="Simple Threshold:").pack(anchor=tk.W, padx=5, pady=2)
        simple_scale = Scale(thresh_frame, from_=0, to=255, orient=tk.HORIZONTAL,
                            variable=self.simple_thresh_value, command=self.update_processing)
        simple_scale.pack(fill=tk.X, padx=5, pady=2)
        
        # OCR controls
        ocr_frame = ttk.LabelFrame(control_frame, text="OCR Settings")
        ocr_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # OCR model selection
        ttk.Label(ocr_frame, text="Model:").pack(anchor=tk.W, padx=5, pady=2)
        self.model_var = tk.StringVar(value="TrOCR Handwritten")
        ttk.Label(ocr_frame, text="Using: microsoft/trocr-large-handwritten").pack(anchor=tk.W, padx=5, pady=2)
        
        # Checkbox for using preprocessed image
        self.use_preprocessed = tk.BooleanVar(value=True)
        preprocess_check = ttk.Checkbutton(ocr_frame, text="Use preprocessed image for OCR", 
                                          variable=self.use_preprocessed)
        preprocess_check.pack(anchor=tk.W, padx=5, pady=5)
        
        # Process buttons
        process_btn = ttk.Button(control_frame, text="Process Image", 
                                command=self.process_image)
        process_btn.pack(fill=tk.X, padx=5, pady=5)
        
        extract_btn = ttk.Button(control_frame, text="Extract Text with TrOCR", 
                                command=self.extract_text)
        extract_btn.pack(fill=tk.X, padx=5, pady=5)
        
        # Save buttons
        save_frame = ttk.Frame(control_frame)
        save_frame.pack(fill=tk.X, padx=5, pady=5)
        
        save_img_btn = ttk.Button(save_frame, text="Save Image", command=self.save_image)
        save_img_btn.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2, pady=5)
        
        save_text_btn = ttk.Button(save_frame, text="Save Text", command=self.save_text)
        save_text_btn.pack(side=tk.RIGHT, fill=tk.X, expand=True, padx=2, pady=5)
        
        # Right panel for image display and text
        display_frame = ttk.Frame(main_frame)
        display_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Create a PanedWindow to divide image display and text display
        paned = ttk.PanedWindow(display_frame, orient=tk.VERTICAL)
        paned.pack(fill=tk.BOTH, expand=True)
        
        # Top frame for image tabs
        image_frame = ttk.Frame(paned)
        paned.add(image_frame, weight=3)
        
        # Bottom frame for OCR text
        text_frame = ttk.LabelFrame(paned, text="Extracted Text")
        paned.add(text_frame, weight=1)
        
        # Create text widget for OCR results
        self.text_display = scrolledtext.ScrolledText(text_frame, wrap=tk.WORD, height=10)
        self.text_display.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Notebook for tabs in the image frame
        self.notebook = ttk.Notebook(image_frame)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        
        # Create tabs
        self.original_tab = ttk.Frame(self.notebook)
        self.gray_tab = ttk.Frame(self.notebook)
        self.blur_tab = ttk.Frame(self.notebook)
        self.thresh_tab = ttk.Frame(self.notebook)
        self.all_steps_tab = ttk.Frame(self.notebook)
        
        self.notebook.add(self.original_tab, text="Original")
        self.notebook.add(self.gray_tab, text="Grayscale")
        self.notebook.add(self.blur_tab, text="Blur")
        self.notebook.add(self.thresh_tab, text="Threshold")
        self.notebook.add(self.all_steps_tab, text="All Steps")
        
        # Status bar
        status_bar = ttk.Label(self.root, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W)
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)
    
    def load_image(self):
        file_path = filedialog.askopenfilename(
            filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.tif")]
        )
        if file_path:
            self.image_path = file_path
            self.status_var.set(f"Loaded: {file_path}")
            self.original_image = cv2.imread(file_path)
            self.process_image()
    
    def process_image(self):
        if self.original_image is None:
            self.status_var.set("No image loaded")
            return
        
        # Convert to grayscale
        self.gray_image = cv2.cvtColor(self.original_image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian Blur
        kernel_size = self.blur_kernel_size.get()
        if kernel_size % 2 == 0:  # Ensure kernel size is odd
            kernel_size += 1
        self.blurred_image = cv2.GaussianBlur(self.gray_image, (kernel_size, kernel_size), 0)
        
        # Apply thresholding
        method = self.threshold_method.get()
        block_size = self.block_size.get()
        c_value = self.c_value.get()
        
        if method == "Adaptive Gaussian":
            self.thresh_image = cv2.adaptiveThreshold(
                self.blurred_image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, block_size, c_value
            )
        elif method == "Adaptive Mean":
            self.thresh_image = cv2.adaptiveThreshold(
                self.blurred_image, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                cv2.THRESH_BINARY, block_size, c_value
            )
        elif method == "Otsu":
            _, self.thresh_image = cv2.threshold(
                self.blurred_image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
        else:  # Simple
            simple_thresh = self.simple_thresh_value.get()
            _, self.thresh_image = cv2.threshold(
                self.blurred_image, simple_thresh, 255, cv2.THRESH_BINARY
            )
        
        self.update_display()
        self.status_var.set("Image processing complete")
    
    def extract_text(self):
        if self.original_image is None:
            self.status_var.set("No image loaded")
            return
        
        try:
            # Choose which image to use for OCR
            if self.use_preprocessed.get() and self.thresh_image is not None:
                # Convert OpenCV image to PIL Image
                pil_image = Image.fromarray(self.thresh_image)
            else:
                # Use original image
                pil_image = Image.fromarray(cv2.cvtColor(self.original_image, cv2.COLOR_BGR2RGB))
            
            self.status_var.set("Extracting text with TrOCR... This may take a moment.")
            self.root.update()  # Update the UI to show the status message
            
            # Process the image with TrOCR
            pixel_values = self.processor(pil_image, return_tensors="pt").pixel_values.to(self.device)
            
            # Generate text
            generated_ids = self.model.generate(pixel_values)
            
            # Decode the generated IDs to text
            self.extracted_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            # Update text display
            self.text_display.delete(1.0, tk.END)
            self.text_display.insert(tk.END, self.extracted_text)
            
            self.status_var.set("Text extraction complete")
        except Exception as e:
            self.status_var.set(f"OCR Error: {str(e)}")
            self.text_display.delete(1.0, tk.END)
            self.text_display.insert(tk.END, f"Error extracting text: {str(e)}\n\n"
                                    "Make sure the required libraries are installed.")
    
    def update_processing(self, event=None):
        if self.original_image is not None:
            self.process_image()
     
    def update_display(self):
        # Clear previous displays
        for widget in self.original_tab.winfo_children():
            widget.destroy()
        for widget in self.gray_tab.winfo_children():
            widget.destroy()
        for widget in self.blur_tab.winfo_children():
            widget.destroy()
        for widget in self.thresh_tab.winfo_children():
            widget.destroy()
        for widget in self.all_steps_tab.winfo_children():
            widget.destroy()
        
        # Display original image
        original_rgb = cv2.cvtColor(self.original_image, cv2.COLOR_BGR2RGB)
        self.display_image(self.original_tab, original_rgb, "Original Image")
        
        # Display grayscale image
        self.display_image(self.gray_tab, self.gray_image, "Grayscale Image")
        
        # Display blurred image
        self.display_image(self.blur_tab, self.blurred_image, 
                          f"Blurred Image (Kernel: {self.blur_kernel_size.get()})")
        
        # Display thresholded image
        self.display_image(self.thresh_tab, self.thresh_image, 
                          f"Thresholded Image (Method: {self.threshold_method.get()})")
        
        # Display all steps
        self.display_all_steps()
    
    def display_image(self, container, image, title):
        # Create figure and axis
        fig, ax = plt.subplots(figsize=(6, 4))
        
        # Display image
        if len(image.shape) == 3:  # Color image
            ax.imshow(image)
        else:  # Grayscale image
            ax.imshow(image, cmap='gray')
        
        ax.set_title(title)
        ax.axis('off')
        
        # Create canvas
        canvas = FigureCanvasTkAgg(fig, master=container)
        canvas.draw()
        canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
    
    def display_all_steps(self):
        # Create figure with subplots
        fig, axes = plt.subplots(1, 4, figsize=(12, 3))
        
        # Display images
        axes[0].imshow(cv2.cvtColor(self.original_image, cv2.COLOR_BGR2RGB))
        axes[0].set_title("Original")
        
        axes[1].imshow(self.gray_image, cmap="gray")
        axes[1].set_title("Grayscale")
        
        axes[2].imshow(self.blurred_image, cmap="gray")
        axes[2].set_title(f"Blur (k={self.blur_kernel_size.get()})")
        
        axes[3].imshow(self.thresh_image, cmap="gray")
        axes[3].set_title(f"Threshold ({self.threshold_method.get()})")
        
        for ax in axes:
            ax.axis("off")
        
        plt.tight_layout()
        
        # Create canvas
        canvas = FigureCanvasTkAgg(fig, master=self.all_steps_tab)
        canvas.draw()
        canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
    
    def save_image(self):
        if self.thresh_image is None:
            self.status_var.set("No processed image to save")
            return
        
        file_path = filedialog.asksaveasfilename(
            defaultextension=".png",
            filetypes=[("PNG files", "*.png"), ("JPEG files", "*.jpg"), ("All files", "*.*")]
        )
        
        if file_path:
            cv2.imwrite(file_path, self.thresh_image)
            self.status_var.set(f"Saved image to: {file_path}")
    
    def save_text(self):
        if not self.extracted_text:
            self.status_var.set("No text to save")
            return
        
        file_path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")]
        )
        
        if file_path:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(self.extracted_text)
            self.status_var.set(f"Saved text to: {file_path}")

if __name__ == "__main__":
    root = tk.Tk()
    app = OCRPreprocessorApp(root)
    root.mainloop()
