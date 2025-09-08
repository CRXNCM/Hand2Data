import torch
import tkinter as tk
from tkinter import filedialog, ttk, scrolledtext
from tkinter.font import Font
from PIL import Image, ImageTk
import os
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from threading import Thread

class ModernOCRApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Handwritten OCR with TrOCR")
        self.root.geometry("900x700")
        self.root.configure(bg="#f5f5f5")
        
        # Set theme
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Configure styles
        self.style.configure('TFrame', background='#f5f5f5')
        self.style.configure('TButton', font=('Arial', 11), background='#4a7abc')
        self.style.configure('TLabel', font=('Arial', 12), background='#f5f5f5')
        self.style.map('TButton',
            foreground=[('pressed', '#ffffff'), ('active', '#ffffff')],
            background=[('pressed', '#3a5a8c'), ('active', '#5a8ad8')])
        
        # Load model in a separate thread
        self.model_loaded = False
        self.status_text = tk.StringVar()
        self.status_text.set("Loading OCR model... Please wait.")
        
        # Create UI
        self.create_widgets()
        
        # Start loading model
        self.load_model_thread = Thread(target=self.load_model)
        self.load_model_thread.daemon = True
        self.load_model_thread.start()
        
        # Current image path
        self.current_image_path = None

    def load_model(self):
        # Configure CUDA for maximum GPU utilization
        if torch.cuda.is_available():
            # Allow TensorFloat32 for faster computation on Ampere GPUs
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            
            # Set CUDA to use all available memory
            torch.cuda.empty_cache()
            
            # Enable cudnn benchmark for faster runtime
            torch.backends.cudnn.benchmark = True
            
            # Get GPU info
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)  # Convert to GB
            
            gpu_info = f"{gpu_name} ({gpu_memory:.2f} GB)"
        else:
            gpu_info = "Not available"

        # Load the large TrOCR model with fast processor explicitly enabled
        self.processor = TrOCRProcessor.from_pretrained("microsoft/trocr-large-handwritten", use_fast=True)
        self.model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-large-handwritten")

        # Use GPU if available with maximum resources
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        
        self.model_loaded = True
        self.status_text.set(f"Model loaded successfully. Using {self.device.upper()} - {gpu_info}")
        self.status_label.configure(foreground="#008800")
        self.upload_btn.config(state=tk.NORMAL)
        self.paste_btn.config(state=tk.NORMAL)

    def create_widgets(self):
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Title
        title_font = Font(family="Arial", size=16, weight="bold")
        title = ttk.Label(main_frame, text="Handwritten Text Recognition", font=title_font)
        title.pack(pady=(0, 15))
        
        # Status label
        self.status_label = ttk.Label(main_frame, textvariable=self.status_text, foreground="#cc6600")
        self.status_label.pack(pady=(0, 10))
        
        # Image frame
        self.image_frame = ttk.LabelFrame(main_frame, text="Image Preview")
        self.image_frame.pack(fill=tk.BOTH, expand=True, pady=10)
        
        # Canvas for image display
        self.canvas = tk.Canvas(self.image_frame, bg="#ffffff", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Button frame
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=10)
        
        # Buttons
        self.upload_btn = ttk.Button(button_frame, text="Upload Image", command=self.open_image, state=tk.DISABLED)
        self.upload_btn.pack(side=tk.LEFT, padx=5)
        
        self.paste_btn = ttk.Button(button_frame, text="Paste from Clipboard", command=self.paste_from_clipboard, state=tk.DISABLED)
        self.paste_btn.pack(side=tk.LEFT, padx=5)
        
        self.clear_btn = ttk.Button(button_frame, text="Clear", command=self.clear_all)
        self.clear_btn.pack(side=tk.LEFT, padx=5)
        
        self.copy_btn = ttk.Button(button_frame, text="Copy Text", command=self.copy_text)
        self.copy_btn.pack(side=tk.RIGHT, padx=5)
        
        # Text output frame
        text_frame = ttk.LabelFrame(main_frame, text="Recognized Text")
        text_frame.pack(fill=tk.BOTH, expand=True, pady=10)
        
        # Text output
        self.text_box = scrolledtext.ScrolledText(text_frame, height=8, font=("Arial", 12))
        self.text_box.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Footer with GPU info
        self.footer = ttk.Label(main_frame, text="Powered by Microsoft TrOCR Large Model", font=("Arial", 8))
        self.footer.pack(pady=(5, 0))

    def open_image(self):
        file_path = filedialog.askopenfilename(
            filetypes=[("Image Files", "*.png;*.jpg;*.jpeg;*.bmp;*.tiff")]
        )
        
        if not file_path:
            return
            
        self.current_image_path = file_path
        self.process_image(file_path)

    def paste_from_clipboard(self):
        try:
            # Create a temporary file for the clipboard image
            temp_path = os.path.join(os.path.dirname(__file__), "temp_clipboard.png")
            
            # Get image from clipboard
            img = ImageTk.PhotoImage(Image.grab())
            
            # Save to temp file
            img._PhotoImage__photo.write(temp_path)
            
            self.current_image_path = temp_path
            self.process_image(temp_path)
            
        except Exception as e:
            self.text_box.delete("1.0", tk.END)
            self.text_box.insert(tk.END, f"Error pasting from clipboard: {str(e)}")

    def process_image(self, image_path):
        if not self.model_loaded:
            return
            
        try:
            # Load and display image
            img = Image.open(image_path).convert("RGB")
            
            # Resize image for display while maintaining aspect ratio
            canvas_width = self.canvas.winfo_width()
            canvas_height = self.canvas.winfo_height()
            
            # Ensure we have valid dimensions
            if canvas_width <= 1:
                canvas_width = 400
            if canvas_height <= 1:
                canvas_height = 300
                
            img_width, img_height = img.size
            ratio = min(canvas_width/img_width, canvas_height/img_height)
            new_width = int(img_width * ratio)
            new_height = int(img_height * ratio)
            
            img_resized = img.resize((new_width, new_height), Image.LANCZOS)
            self.img_tk = ImageTk.PhotoImage(img_resized)
            
            # Clear canvas and display image
            self.canvas.delete("all")
            self.canvas.create_image(canvas_width//2, canvas_height//2, image=self.img_tk)
            
            # Update status
            self.status_text.set("Processing image...")
            self.status_label.configure(foreground="#cc6600")
            self.root.update()
            
            # Process image with TrOCR
            extracted_text = self.ocr_handwritten_text(image_path)
            self.text_box.delete("1.0", tk.END)
            self.text_box.insert(tk.END, extracted_text)
            
            # Update status
            self.status_text.set("Text recognition completed!")
            self.status_label.configure(foreground="#008800")
            
        except Exception as e:
            self.text_box.delete("1.0", tk.END)
            self.text_box.insert(tk.END, f"Error processing image: {str(e)}")
            self.status_text.set("Error processing image")
            self.status_label.configure(foreground="#cc0000")

    def ocr_handwritten_text(self, image_path):
        image = Image.open(image_path).convert("RGB")

        # Preprocess image
        pixel_values = self.processor(images=image, return_tensors="pt").pixel_values.to(self.device)

        # Run OCR with maximum GPU utilization
        with torch.no_grad():
            # Set to use maximum batch size that fits in memory
            generated_ids = self.model.generate(
                pixel_values,
                max_length=128,
                num_beams=5,  # Increase beam search for better results
                early_stopping=True
            )
        extracted_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

        return extracted_text

    def clear_all(self):
        self.canvas.delete("all")
        self.text_box.delete("1.0", tk.END)
        self.current_image_path = None
        self.status_text.set("Ready")
        self.status_label.configure(foreground="#000000")

    def copy_text(self):
        text = self.text_box.get("1.0", tk.END).strip()
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        self.status_text.set("Text copied to clipboard!")
        self.status_label.configure(foreground="#008800")

# Initialize Tkinter window
if __name__ == "__main__":
    root = tk.Tk()
    app = ModernOCRApp(root)
    root.mainloop()
