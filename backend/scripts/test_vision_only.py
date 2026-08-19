#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script to check what the vision system extracts from the user's test image.
"""

import asyncio
import base64
import json
import sys
import io
from pathlib import Path

# Set UTF-8 encoding for stdout
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from app.services.image import image_to_base64
from app.services.nim_client import NIMClient
from app.prompts import VISION_PROMPT


async def test_vision_only():
    image_path = r"C:\Users\devon\Downloads\image.jpeg"

    print(f"Testing vision with image: {image_path}")

    # Load and encode image
    image_b64 = image_to_base64(image_path)
    print(f"Image encoded, length: {len(image_b64)} chars")

    # Create NIM client
    nim_client = NIMClient()

    # Prepare messages for vision
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": VISION_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
            ]
        }
    ]

    try:
        print("Calling vision model...")
        response = await nim_client.client.chat.completions.create(
            model=nim_client.vision_model,
            messages=messages,
            max_tokens=2048,
            temperature=0.1,
        )

        message = response.choices[0].message
        content = message.content or ""
        
        print("\n" + "=" * 60)
        print("VISION OUTPUT")
        print("=" * 60)
        print(content.encode('utf-8', errors='replace').decode('utf-8'))
        
        # Try to parse as JSON
        try:
            parsed = json.loads(content.strip())
            print("\n" + "=" * 60)
            print("PARSED JSON")
            print("=" * 60)
            print(json.dumps(parsed, indent=2))
            
            # Check specifically for angle information
            if 'knowns' in parsed:
                print("\n" + "=" * 60)
                print("KNOWN VALUES")
                print("=" * 60)
                for key, value in parsed['knowns'].items():
                    print(f"  {key}: {value}")
                    
        except json.JSONDecodeError as e:
            print(f"\nCould not parse as JSON: {e}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_vision_only())