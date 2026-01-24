#!/usr/bin/env python3
"""
Convert Taisne KML file to JSON format compatible with the cave search webpage.
"""

import xml.etree.ElementTree as ET
import json
import urllib.parse
import html
import re
import sys
from datetime import datetime

def extract_description_fields(description_html):
    """Extract structured information from the HTML description."""
    fields = {}

    # Remove CDATA wrapper and get the content
    content = description_html.strip()
    if content.startswith('<![CDATA[') and content.endswith(']]>'):
        content = content[9:-3]  # Remove CDATA wrapper

    # Extract fields using regex patterns (updated to handle multi-line descriptions better)
    patterns = {
        'commune': r'<b>Commune</b>\s*:\s*<a[^>]*>([^<]+)(?:</a>|</href>)',
        'commune_simple': r'<b>Commune</b>\s*:\s*([^<]+?)<br/>',
        'ign': r'<b>IGN</b>\s*:\s*([^<]+?)<br/>',
        'altitude': r'<b>Altitude</b>\s*:\s*([^<]+?)<br/>',
        'description': r'<b>Description</b>\s*:\s*(.*?)(?:<br/><b>|$)',
        'page_taisne': r'<b>Page Taisne</b>\s*:\s*([^<]+?)(?:<br/>|\]\]>|$)',
        'plan': r'<b>Plan</b>\s*:\s*([^<]+?)(?:<br/>|\]\]>|$)',
        'alias': r'<b>Alias</b>\s*:\s*([^<]+?)<br/>',
        'x_lambert3': r'<b>X Lambert3</b>\s*:\s*([^<]+?)<br/>',
        'y_lambert3': r'<b>Y Lambert3</b>\s*:\s*([^<]+?)<br/>'
    }

    for field_name, pattern in patterns.items():
        match = re.search(pattern, content, re.DOTALL)
        if match:
            value = match.group(1).strip()
            # Clean up multi-line descriptions
            if field_name == 'description':
                value = re.sub(r'<br/>', ' ', value)
                value = re.sub(r'\s+', ' ', value)
            fields[field_name] = value

    # Try commune extraction without link if first pattern fails
    if 'commune' not in fields and 'commune_simple' in fields:
        fields['commune'] = fields['commune_simple']

    return fields

def determine_cave_type(name):
    """Determine the cave type based on the name."""
    name_lower = name.lower()

    if any(word in name_lower for word in ['grotte', 'cave', 'caverne']):
        return 'grotte'
    elif any(word in name_lower for word in ['igue', 'abime', 'abîme', 'gouffre']):
        return 'igue'
    elif any(word in name_lower for word in ['perte', 'emergence', 'exsurgence', 'résurgence']):
        return 'perte/résurgence'
    elif any(word in name_lower for word in ['abri']):
        return 'abri'
    else:
        return 'cavité'

def clean_name(name):
    """Clean and normalize the cave name."""
    # Remove extra whitespace
    name = re.sub(r'\s+', ' ', name.strip())

    # Capitalize properly
    # Keep existing capitalization for acronyms, but fix basic issues
    return name

def main():
    try:
        # Parse the KML file
        tree = ET.parse('input/taisne.kml')
        root = tree.getroot()

        # Define namespace
        ns = {'kml': 'http://www.opengis.net/kml/2.2'}

        caves_data = []
        duplicates = []
        ignored = []
        kept_uids = set()

        # Find all placemarks
        placemarks = root.findall('.//kml:Placemark', ns)
        print(f"Found {len(placemarks)} placemarks in KML file")

        for placemark in placemarks:
            # Extract basic information
            name_element = placemark.find('kml:name', ns)
            description_element = placemark.find('kml:description', ns)
            point_element = placemark.find('.//kml:Point/kml:coordinates', ns)

            # Skip if missing essential data
            if name_element is None or point_element is None:
                ignored.append("Missing name or coordinates")
                continue

            # Extract coordinates (format: longitude,latitude,altitude)
            coords_text = point_element.text.strip()
            try:
                coord_parts = coords_text.split(',')
                longitude = float(coord_parts[0])
                latitude = float(coord_parts[1])
                # altitude = float(coord_parts[2]) if len(coord_parts) > 2 else 0
            except (ValueError, IndexError):
                ignored.append(f"Invalid coordinates: {coords_text}")
                continue

            # Clean the name and handle HTML entities
            name = clean_name(name_element.text)
            name = html.unescape(name)  # Decode HTML entities

            # Check for duplicates
            uid = f"{latitude:.6f}|{longitude:.6f}|{name}"
            if uid in kept_uids:
                duplicates.append(uid)
                continue

            # Extract description fields
            description_fields = {}
            if description_element is not None and description_element.text:
                description_fields = extract_description_fields(description_element.text)

            # Determine cave type
            cave_type = determine_cave_type(name)

            # Create cave data object
            name_encoded = urllib.parse.urlencode({'name': name}).replace('name=', '')
            name_html = name  # Use the clean name directly

            cave_data = {
                "name": name_html,
                "name_encoded": name_encoded,
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
                "type": cave_type,
                "locality": "precis",  # Taisne data is generally precise
                "search_name": name_html.lower(),
                "search_type": cave_type.lower(),
                "search_locality": "precis",
                # Additional Taisne-specific fields
                "source": "taisne",
                "commune": description_fields.get('commune', ''),
                "ign": description_fields.get('ign', ''),
                "altitude": description_fields.get('altitude', ''),
                "page_taisne": description_fields.get('page_taisne', ''),
                "plan": description_fields.get('plan', ''),
                "description": description_fields.get('description', ''),
                "alias": description_fields.get('alias', '')
            }

            caves_data.append(cave_data)
            kept_uids.add(uid)

        # Create the final JSON structure
        output_data = {
            "metadata": {
                "total_caves": len(caves_data),
                "generation_date": datetime.now().isoformat(),
                "source": "Taisne KML file",
                "statistics": {
                    "total_entries": len(placemarks),
                    "kept": len(caves_data),
                    "duplicates_removed": len(duplicates),
                    "ignored": len(ignored)
                },
                "filters_applied": [
                    "Removed entries with missing names or coordinates",
                    "Removed duplicate coordinates/names",
                    "Added cave type classification based on name analysis"
                ]
            },
            "caves": caves_data
        }

        # Write JSON to file
        with open("output/taisne_data.json", "w", encoding="utf-8") as json_file:
            json.dump(output_data, json_file, ensure_ascii=False, indent=2)

        print(f"""
JSON generation completed successfully!

Statistics:
- Total placemarks in KML: {len(placemarks)}
- Caves kept: {len(caves_data)}
- Duplicates removed: {len(duplicates)}
- Entries ignored: {len(ignored)}
- Output file: output/taisne_data.json

Processing completed:
- Extracted structured data from descriptions
- Classified cave types automatically
- Preserved Taisne-specific metadata (commune, IGN, altitude, etc.)
- Generated search-friendly fields
        """)

        # Show a few examples
        if caves_data:
            print("Sample entries:")
            for i, cave in enumerate(caves_data[:3]):
                print(f"  {i+1}. {cave['name']} ({cave['type']}) - {cave.get('commune', 'Unknown commune')}")

    except FileNotFoundError:
        print("Error: input/taisne.kml file not found!")
        sys.exit(1)
    except ET.ParseError as e:
        print(f"Error parsing KML file: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()