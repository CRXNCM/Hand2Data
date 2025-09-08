import os
import sys
import argparse
from datetime import datetime
from pathlib import Path
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

# Available models with metadata
AVAILABLE_MODELS = {
    "small-handwritten": {
        "repo": "microsoft/trocr-small-handwritten",
        "size": "~150 MB"
    },
    "small-printed": {
        "repo": "microsoft/trocr-small-printed",
        "size": "~150 MB"
    },
    "base-handwritten": {
        "repo": "microsoft/trocr-base-handwritten",
        "size": "~450 MB"
    },
    "base-printed": {
        "repo": "microsoft/trocr-base-printed",
        "size": "~450 MB"
    },
    "large-handwritten": {
        "repo": "microsoft/trocr-large-handwritten",
        "size": "~1.4 GB"
    },
    "large-printed": {
        "repo": "microsoft/trocr-large-printed",
        "size": "~1.4 GB"
    }
}


LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
DEFAULT_LOG_FILE = LOG_DIR / "trocr_download.log"


def get_log_file(custom_path: str | None) -> Path:
    if custom_path:
        p = Path(custom_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        return p
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return LOG_DIR / f"trocr_download_{timestamp}.log"


def log(message: str, log_path: Path | None):
    safe_message = str(message)
    print(safe_message)
    if log_path is None:
        return
    try:
        with log_path.open("a", encoding="utf-8", errors="ignore") as f:
            f.write(safe_message + "\n")
    except Exception:
        # Silently ignore logging errors to not break the flow
        pass


def choose_model():
    """Prompt the user to select a model from the list"""
    print("\nAvailable TrOCR Models:\n")
    for i, (name, meta) in enumerate(AVAILABLE_MODELS.items(), start=1):
        print(f"[{i}] {name}  ({meta['repo']}, {meta['size']})")

    choice = input("\nEnter the number of the model you want to download: ").strip()
    try:
        choice_idx = int(choice) - 1
        if choice_idx < 0 or choice_idx >= len(AVAILABLE_MODELS):
            raise ValueError
        model_key = list(AVAILABLE_MODELS.keys())[choice_idx]
        return model_key, AVAILABLE_MODELS[model_key]["repo"]
    except Exception:
        print("Invalid selection. Please run again and choose a valid number.")
        sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description="Download TrOCR model and processor")
    parser.add_argument("--model", dest="model_key", choices=list(AVAILABLE_MODELS.keys()),
                        help="Model key to download (non-interactive)")
    parser.add_argument("--log-file", dest="log_file", default=None,
                        help="Path to write detailed download logs")
    return parser.parse_args()


def download_model(model_key: str | None = None, log_file: str | None = None):
    args_log = get_log_file(log_file)
    log("Starting TrOCR download utility", args_log)
    log(f"Log file: {args_log}", args_log)

    # Let user pick model if not provided
    if not model_key:
        model_key, model_name = choose_model()
    else:
        if model_key not in AVAILABLE_MODELS:
            log(f"Error: Unknown model key '{model_key}'", args_log)
            sys.exit(1)
        model_name = AVAILABLE_MODELS[model_key]["repo"]
        log(f"Selected model key: {model_key} -> {model_name}", args_log)

    # Create local directory for chosen model
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"trocr-{model_key}")
    os.makedirs(model_dir, exist_ok=True)
    log(f"Target directory: {model_dir}", args_log)

    # Skip download if already present
    if os.path.exists(os.path.join(model_dir, "config.json")):
        log(f"Model '{model_name}' already exists at {model_dir}", args_log)
        return

    try:
        log(f"Downloading {model_name}...", args_log)
        log("Environment info:", args_log)
        log(f"  HF_HOME={os.environ.get('HF_HOME', '')}", args_log)
        log(f"  TRANSFORMERS_CACHE={os.environ.get('TRANSFORMERS_CACHE', '')}", args_log)
        log(f"  PYTHON={sys.executable}", args_log)

        # Step 1: Download processor
        log("Step 1/2: Downloading processor...", args_log)
        try:
            # Try fast tokenizer first
            processor = TrOCRProcessor.from_pretrained(model_name, use_fast=True)
        except Exception as e:
            # Fallback to slow tokenizer (requires sentencepiece)
            log(f"   Fast tokenizer failed: {e}", args_log)
            log("   Falling back to slow tokenizer (requires sentencepiece)...", args_log)
            processor = TrOCRProcessor.from_pretrained(model_name, use_fast=False)
        processor.save_pretrained(model_dir)
        log("   Processor saved.", args_log)

        # Step 2: Download model
        log("Step 2/2: Downloading model (this may take several minutes)...", args_log)
        model = VisionEncoderDecoderModel.from_pretrained(model_name)
        model.save_pretrained(model_dir)
        log("   Model saved.", args_log)

        log(f"Download complete! Model stored at: {os.path.abspath(model_dir)}", args_log)
        log("Done.", args_log)

    except Exception as e:
        log(f"Error: {str(e)}", args_log)
        sys.exit(1)


if __name__ == "__main__":
    _args = parse_args()
    download_model(model_key=_args.model_key, log_file=_args.log_file)
