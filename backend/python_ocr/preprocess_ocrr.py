import cv2
import numpy as np
import tkinter as tk
from tkinter import ttk, filedialog, Scale
from PIL import Image, ImageTk
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

class OCRPreprocessorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("OCR Image Preprocessing Visualizer")
        self.root.geometry("1200x800")
        
        # Initialize variables
        self.image_path = None
        self.original_image = None
        self.gray_image = None
        self.blurred_image = None
        self.thresh_image = None
        
        # Default parameters
        self.blur_kernel_size = tk.IntVar(value=5)
        self.threshold_method = tk.StringVar(value="Adaptive Gaussian")
        self.block_size = tk.IntVar(value=11)
        self.c_value = tk.IntVar(value=2)
        self.simple_thresh_value = tk.IntVar(value=127)
        
        self.create_widgets()
        
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
        
        # Process button
        process_btn = ttk.Button(control_frame, text="Process Image", command=self.process_image)
        process_btn.pack(fill=tk.X, padx=5, pady=10)
        
        # Save button
        save_btn = ttk.Button(control_frame, text="Save Processed Image", command=self.save_image)
        save_btn.pack(fill=tk.X, padx=5, pady=5)
        
        # Right panel for image display
        display_frame = ttk.Frame(main_frame)
        display_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Notebook for tabs
        self.notebook = ttk.Notebook(display_frame)
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
        self.status_var = tk.StringVar(value="Ready")
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
        self.status_var.set("Processing complete")
    
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
            self.status_var.set(f"Saved to: {file_path}")

if __name__ == "__main__":
    root = tk.Tk()
    app = OCRPreprocessorApp(root)
    root.mainloop()
