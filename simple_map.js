

//top-left reference point
var top_left = {
    scrX: 20,        // Minimum X position on screen
    scrY: 20,         // Minimum Y position on screen
    lat: 0,    // Latitude
    lng: 0     // Longitude
}

//bottom-right reference point
var bottom_right = {
    scrX: 0,          // Maximum X position on screen
    scrY: 0,        // Maximum Y position on screen
    lat: 0,    // Latitude,
    lng: 0     // Longitude
}

//## Now I can calculate the global X and Y for each reference point ##\\

// This function converts lat and lng coordinates to GLOBAL X and Y positions
function latlngToGlobalXY(pt) {
    if (pt == null || pt.lat == null || pt.lng == null) {
        return null;
    }

    let lat = pt.lat;
    let lng = pt.lng;

    var radius = 6371;      //Earth Radius in Km

    //Calculates x based on cos of average of the latitudes
    let x = radius*lng*Math.cos((top_left.lat + bottom_right.lat)/2);
    //Calculates y based on latitude
    let y = radius*lat;

    return {x: x, y: y}
}

/*
 * This gives me the X and Y in relation to map for the 2 reference points.
 * Now we have the global AND screen areas and then we can relate both for the projection point.
 */

// This function converts lat and lng coordinates to SCREEN X and Y positions
function latlngToScreenXY(pt) {
    //Calculate global X and Y for projection point
    let pos = latlngToGlobalXY(pt);
    if (pos == null) {
        return null;
    }

    //Calculate the percentage of Global X position in relation to total global width
    pos.perX = ((pos.x-top_left.pos.x)/(bottom_right.pos.x - top_left.pos.x));
    //Calculate the percentage of Global Y position in relation to total global height
    pos.perY = ((pos.y-top_left.pos.y)/(bottom_right.pos.y - top_left.pos.y));

    //Returns the screen position based on reference points
    return {
        x: top_left.scrX + (bottom_right.scrX - top_left.scrX)*pos.perX,
        y: top_left.scrY + (bottom_right.scrY - top_left.scrY)*pos.perY
    }
}

function moveLoc(pt, move) {
    // Earth’s radius in meter, sphere
    R = 6378137

    // Coordinate offsets in radians
    dLat = move.north/R
    dLng = move.east/(R*Math.cos(Math.PI*pt.lat/180))

    // OffsetPosition, decimal degrees
    return {
        lat: pt.lat + dLat * 180/Math.PI,
        lng: pt.lng + dLng * 180/Math.PI
    }
}

function rad(degrees) {
    return degrees * (Math.PI/180);
}

function deg(radians) {
    return radians * 180 / Math.PI;
}

// ----------------------------------------------------- //
//                 plotting functions
// ----------------------------------------------------- //

function onResize() {
    c.width = window.innerWidth * 0.95;
    if (c.height < c.width) {
        c.height = window.innerHeight * 0.95;
    } else {
        c.height = c.width
    }


    bottom_right.scrX = c.width - 20;
    bottom_right.scrY = c.height - 20;
}

let CIRCLE_RADIUS = 5;
let BEARING_DIST = 200; // m
let path = [];
var path_index = 0;
var compass_bearing = null;

function setStartPos(pos) {
    path_index = 0;
    path.length = 0;
    path.push(pos);
    path.push(pos);
}

function gotoCurrent() {
    let current = get_current_position();
    if (current == null) return;

    let current_xy = latlngToScreenXY(current);
    if (current_xy == null) return;

    ctx.moveTo(current_xy.x, current_xy.y);
}
function gotoPrevious() {
    let previous_xy = latlngToScreenXY(get_previous_position());
    ctx.moveTo(previous_xy.x, previous_xy.y);
}

function plotCircle(pos, color) {
    if (pos == null || pos.lat == null || pos.lng == null) {
        return; // Skip drawing if position is invalid
    }

    ctx.beginPath();

    let pos_xy = latlngToScreenXY(pos);
    if (pos_xy == null) return;

    ctx.arc(pos_xy.x, pos_xy.y, CIRCLE_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = color ? color : "green"
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = color ? color : "green";
    ctx.stroke();

    ctx.closePath();
}

function drawLineToCurrent() {
    let current_pos = get_current_position();
    let previous_pos = get_previous_position();

    if (current_pos == null || previous_pos == null) return;

    let current_xy = latlngToScreenXY(current_pos);
    let previous_xy = latlngToScreenXY(previous_pos);

    if (current_xy == null || previous_xy == null) return;

    ctx.beginPath();
    ctx.moveTo(previous_xy.x, previous_xy.y);
    ctx.lineTo(current_xy.x, current_xy.y);

    ctx.lineWidth = 3;
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.closePath();
}

function plot_bearing(brng, color, lineStyle) {
    let loc = get_point_at_bearing(brng, BEARING_DIST);
    let pt = latlngToScreenXY(loc)

    ctx.beginPath();
    gotoCurrent();

    ctx.strokeStyle = color ? color : 'green';
    ctx.lineWidth = 2;

    // Set line style (solid or dashed)
    if (lineStyle === 'dashed') {
        ctx.setLineDash([10, 5]);
    } else {
        ctx.setLineDash([]);
    }

    ctx.lineTo(pt.x, pt.y);

    ctx.stroke();

    ctx.closePath();
}

function plot_compass_bearing_from_center() {
    if (compass_bearing == null) return;

    // Use center of map when no GPS position available
    const centerX = c.width / 2;
    const centerY = c.height / 2;

    const radian = (compass_bearing - 90) * Math.PI / 180; // -90 to make 0° point north
    const lineLength = 80; // Fixed length for compass line

    ctx.beginPath();
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);

    // Draw line from center outward in compass direction
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
        centerX + lineLength * Math.cos(radian),
        centerY + lineLength * Math.sin(radian)
    );

    // Add arrow head
    const arrowLength = 12;
    const arrowAngle = Math.PI / 6; // 30 degrees
    const tipX = centerX + lineLength * Math.cos(radian);
    const tipY = centerY + lineLength * Math.sin(radian);

    ctx.lineTo(tipX - arrowLength * Math.cos(radian - arrowAngle),
               tipY - arrowLength * Math.sin(radian - arrowAngle));
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - arrowLength * Math.cos(radian + arrowAngle),
               tipY - arrowLength * Math.sin(radian + arrowAngle));

    ctx.stroke();
    ctx.closePath();
}

function plot_target_bearing() {
    if (simple_map_dest_loc.lat == null) {
        return;
    }

    let current = get_current_position();
    let startPoint;

    if (current == null) {
        // Use map center coordinates when no GPS position available
        let centerX = c.width / 2;
        let centerY = c.height / 2;

        // Convert screen center back to lat/lng (approximate)
        let centerLat = simple_map_dest_loc.lat - 0.01;  // Offset for visibility
        let centerLng = simple_map_dest_loc.lng;

        startPoint = {
            lat: centerLat,
            lng: centerLng
        };
    } else {
        startPoint = current;
    }

    let target_bearing = calcBearing(startPoint.lat, startPoint.lng, simple_map_dest_loc.lat, simple_map_dest_loc.lng);

    ctx.beginPath();

    // Draw from current position or map center
    let start_xy = latlngToScreenXY(startPoint);
    ctx.moveTo(start_xy.x, start_xy.y);

    // Draw a prominent red solid line pointing to target
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.setLineDash([]); // Solid line

    let loc = get_point_at_bearing(target_bearing, BEARING_DIST);
    let pt = latlngToScreenXY(loc);
    ctx.lineTo(pt.x, pt.y);

    ctx.stroke();
    ctx.setLineDash([]); // Reset to solid line
    ctx.closePath();
}

function get_point_at_bearing(brng, dist) {
    dist /= 6371000;
    brng = rad(brng);

    let last = get_current_position()

    let lat1 = rad(last.lat)
    let lon1 = rad(last.lng)

    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist) +
                         Math.cos(lat1) * Math.sin(dist) * Math.cos(brng));
    var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) * Math.cos(lat1),
                                 Math.cos(dist) - Math.sin(lat1) * Math.sin(lat2));

    let new_loc = {lat: deg(lat2), lng: deg(lon2)};

    return new_loc;
}

function get_path_bearing() {
    let previous = get_previous_position();
    let current = get_current_position();

    return calcBearing(previous.lat, previous.lng, current.lat, current.lng);
}

function mark_current_position() {
    plotCircle(get_current_position(), "green");
}

function draw_scale_bar() {
    if (path.length == 0) return;

    // Calculate the distance represented by 100 pixels
    let current = get_current_position();
    let scale_distance_m = 100; // Start with 100m
    let scale_point = get_point_at_bearing(90, scale_distance_m); // Point 100m east

    let current_screen = latlngToScreenXY(current);
    let scale_screen = latlngToScreenXY(scale_point);
    let pixels_per_100m = Math.abs(scale_screen.x - current_screen.x);

    // Adjust scale to reasonable values
    let scale_values = [10, 25, 50, 100, 250, 500, 1000, 2000, 5000];
    let target_pixels = 80; // Target scale bar length in pixels

    let best_scale = 100;
    let best_pixels = pixels_per_100m;

    for (let scale of scale_values) {
        let projected_pixels = (scale / 100) * pixels_per_100m;
        if (projected_pixels >= 40 && projected_pixels <= 120) {
            best_scale = scale;
            best_pixels = projected_pixels;
            break;
        }
    }

    // Draw scale bar in bottom-left corner - mobile adaptive
    let bar_x = Math.min(30, c.width * 0.05);
    let bar_y = c.height - Math.min(40, c.height * 0.1);
    let bar_width = best_pixels;

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'white';

    // Background rectangle
    ctx.fillRect(bar_x - 5, bar_y - 20, bar_width + 30, 30);
    ctx.strokeRect(bar_x - 5, bar_y - 20, bar_width + 30, 30);

    // Scale bar
    ctx.beginPath();
    ctx.moveTo(bar_x, bar_y);
    ctx.lineTo(bar_x + bar_width, bar_y);

    // End markers
    ctx.moveTo(bar_x, bar_y - 5);
    ctx.lineTo(bar_x, bar_y + 5);
    ctx.moveTo(bar_x + bar_width, bar_y - 5);
    ctx.lineTo(bar_x + bar_width, bar_y + 5);

    ctx.stroke();

    // Scale text
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    let scale_text = best_scale >= 1000 ? `${best_scale/1000}km` : `${best_scale}m`;
    ctx.fillText(scale_text, bar_x + bar_width/2, bar_y - 8);
}

function draw_legend() {
    // Skip legend on very small screens (less than 300px wide)
    if (c.width < 300) {
        return;
    }

    // Legend positioning - adaptive for mobile
    let legend_width = Math.min(150, c.width * 0.4);
    let legend_height = 140;
    let legend_x = c.width - legend_width - 10; // 10px margin from right
    let legend_y = 20;

    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legend_x, legend_y, legend_width, legend_height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(legend_x, legend_y, legend_width, legend_height);

    // Title
    ctx.fillStyle = 'black';
    let title_font_size = Math.max(10, Math.min(12, legend_width / 12));
    ctx.font = `bold ${title_font_size}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('Légende', legend_x + 5, legend_y + 15);

    // Legend items - adjust font size for mobile
    let item_font_size = Math.max(8, Math.min(10, legend_width / 15));
    ctx.font = `${item_font_size}px Arial`;
    let item_y = legend_y + 30;
    let item_spacing = Math.max(14, Math.min(18, legend_width / 8));

    // Target (red circle)
    ctx.beginPath();
    ctx.arc(legend_x + 10, item_y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.fillText('Cible', legend_x + 20, item_y + 3);

    // Current position (green circle)
    item_y += item_spacing;
    ctx.beginPath();
    ctx.arc(legend_x + 10, item_y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'green';
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.fillText('Position actuelle', legend_x + 20, item_y + 3);

    // Start position (blue circle)
    item_y += item_spacing;
    ctx.beginPath();
    ctx.arc(legend_x + 10, item_y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.fillText('Départ', legend_x + 20, item_y + 3);

    // Direction to target (red dashed line)
    item_y += item_spacing;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(legend_x + 5, item_y);
    ctx.lineTo(legend_x + 15, item_y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'black';
    ctx.fillText('Direction cible', legend_x + 20, item_y + 3);

    // Movement direction (green line)
    item_y += item_spacing;
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legend_x + 5, item_y);
    ctx.lineTo(legend_x + 15, item_y);
    ctx.stroke();
    ctx.fillStyle = 'black';
    ctx.fillText('Direction mouvement', legend_x + 20, item_y + 3);

    // Compass direction (orange line)
    item_y += item_spacing;
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legend_x + 5, item_y);
    ctx.lineTo(legend_x + 15, item_y);
    ctx.stroke();
    ctx.fillStyle = 'black';
    ctx.fillText('Boussole', legend_x + 20, item_y + 3);
}


function update_bound_box() {
    top_left.lng = simple_map_dest_loc.lng;
    top_left.lat = simple_map_dest_loc.lat;

    bottom_right.lng = simple_map_dest_loc.lng;
    bottom_right.lat = simple_map_dest_loc.lat;

    for (pos of path) {
        top_left.lng = Math.min(top_left.lng, pos.lng);
        top_left.lat = Math.max(top_left.lat, pos.lat);

        bottom_right.lng = Math.max(bottom_right.lng, pos.lng);
        bottom_right.lat = Math.min(bottom_right.lat, pos.lat);
    }

    // Calculate global X and Y for top-left reference point
    top_left.pos = latlngToGlobalXY(top_left);
    // Calculate global X and Y for bottom-right reference point
    bottom_right.pos = latlngToGlobalXY(bottom_right);
}

function get_start_position() {
    if (path.length == 0) {
        return null
    }

    return path[0]
}

function get_current_position() {
    if (path.length == 0) {
        return null
    }

    return path[path_index]
}

function get_previous_position() {
    if (path.length == 0) {
        return null
    } else if (path.length == 1) {

        return get_current_position();
    } else {
        return path[path_index - 1]
    }
}

function plot_path() {
    path_index = 1;
    while (path_index < path.length) {
        drawLineToCurrent();
        path_index++;
    }
    path_index--;
}

function simple_map_add_to_path(new_loc, brng) {
    add_to_path(new_loc);

    if (brng != null) {
        compass_bearing = brng;
    }

    redraw();
}

function add_to_path(new_loc) {
    path.push(new_loc);
}

function resetPath() {
    // Get current GPS position and reset the path to start from there
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const newStartPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setStartPos(newStartPos);
                redraw();
                console.log("Path reset to current GPS position:", newStartPos);
            },
            function(error) {
                alert("Impossible d'obtenir la position GPS pour réinitialiser le trajet");
                console.error("GPS error for path reset:", error);
            },
            {
                timeout: 10000,
                enableHighAccuracy: true,
                maximumAge: 60000
            }
        );
    } else {
        alert("GPS non disponible sur cet appareil");
    }
}

// ----------------------------------------------------- //
//                 testing functions
// ----------------------------------------------------- //

let moves = [
    {north: -100, east:    0},
    {north:    0, east:  100},
    {north:  200, east:    0},
    {north: -100, east:  100},
    {north:    0, east:  100},
    {north:    0, east:  100},
    {north:    0, east:  100},
    {north: -100, east:  100},
    {north: -100, east:  100},
    {north: -100, east:  100},
    {north: -100, east: -100},
    {north: -100, east: -100},
    {north: -100, east:  100},
    {north:    0, east: -200},
    {north: -100, east: -100},
    {north: -100, east: -200},
    {north: -100, east:  100},
    {north: -100, east:  100},
    {north: -100, east:  100},
    {north:    0, east: -600},
    {north: -200, east:    0},
    {north: -200, east:  100},
    {north: -100, east:  100},
    {north: -100, east:  300},
    {north: -200, east:  300},
    {north:    0, east:  300},
    {north: -150, east:  150}
]

var move_index = 0;
function do_simulate_move() {
    if (move_index >= moves.length) return;
    var current_pos = get_current_position();
    if (current_pos == null) {
        current_pos = {
            lng: 1.3795,
            lat: 44.5121,
        }
    } else {
        current_pos = moveLoc(current_pos, moves[move_index]);
        move_index++;
    }
    simple_map_add_to_path(current_pos, 4*3*move_index);

    redraw()
}

// ----------------------------------------------------- //
//                 UI functions
// ----------------------------------------------------- //

var c = null;
var ctx = null;

// Compass variables
var compass_canvas = null;
var compass_ctx = null;
var current_heading = null;
var target_bearing = null;
var orientation_events_added = false;
var compassEventType = ""; // Track which event type is being used

let simple_map_dest_loc = {lat: null, lng: null};

function redraw() {
    ctx.clearRect(0, 0, c.width, c.height);
    update_bound_box()

    let start_loc = get_start_position();
    if (start_loc == null) {
        // Show target location even without GPS
        if (simple_map_dest_loc.lat != null) {
            plotCircle(simple_map_dest_loc, "red");
        }
        ctx.fillStyle = 'gray';
        ctx.font = '14px Arial';
        ctx.fillText("En attente du GPS...", 10, 30);
        return;
    }

    // Show both start position and target when we have GPS data
    plotCircle(start_loc, "blue");
    plotCircle(simple_map_dest_loc, "red");

    plot_path();

    // Show direction indicators
    plot_bearing(get_path_bearing(), "green");           // Movement direction

    // Show compass bearing (orange line)
    if (compass_bearing != null) {
        if (get_current_position() != null) {
            plot_bearing(compass_bearing, "orange");     // Device compass from GPS position
        } else {
            plot_compass_bearing_from_center();          // Device compass from map center
        }
    }
    plot_target_bearing();                               // Direction to target (red arrow)

    mark_current_position();

    // Add scale bar (legend is now external HTML)
    draw_scale_bar();
}

// ----------------------------------------------------- //
//                 Compass functions
// ----------------------------------------------------- //

function draw_compass() {
    if (!compass_ctx) return;

    const centerX = compass_canvas.width / 2;
    const centerY = compass_canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    compass_ctx.clearRect(0, 0, compass_canvas.width, compass_canvas.height);

    // Save context for rotation
    compass_ctx.save();

    // Rotate the entire compass face based on current heading
    // So that North always points to magnetic north
    if (current_heading !== null) {
        compass_ctx.translate(centerX, centerY);
        compass_ctx.rotate(-current_heading * Math.PI / 180); // Negative to rotate face opposite to heading
        compass_ctx.translate(-centerX, -centerY);
    }

    // Draw compass face background
    compass_ctx.beginPath();
    compass_ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    compass_ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    compass_ctx.fill();
    compass_ctx.strokeStyle = '#34495e';
    compass_ctx.lineWidth = 2;
    compass_ctx.stroke();

    // Draw degree marks (these will rotate with the face)
    compass_ctx.strokeStyle = '#7f8c8d';
    compass_ctx.lineWidth = 1;
    for (let angle = 0; angle < 360; angle += 15) {
        const radian = (angle - 90) * Math.PI / 180;
        const isMainDirection = angle % 90 === 0;
        const markLength = isMainDirection ? 15 : 8;

        const x1 = centerX + (radius - markLength) * Math.cos(radian);
        const y1 = centerY + (radius - markLength) * Math.sin(radian);
        const x2 = centerX + radius * Math.cos(radian);
        const y2 = centerY + radius * Math.sin(radian);

        compass_ctx.beginPath();
        compass_ctx.moveTo(x1, y1);
        compass_ctx.lineTo(x2, y2);
        compass_ctx.stroke();
    }

    // Draw N/S/E/W labels (these will rotate with the face)
    compass_ctx.fillStyle = '#2c3e50';
    compass_ctx.font = 'bold 16px Arial';
    compass_ctx.textAlign = 'center';
    compass_ctx.textBaseline = 'middle';

    const labelRadius = radius - 25;

    // North (red)
    compass_ctx.fillStyle = '#e74c3c';
    compass_ctx.font = 'bold 18px Arial';
    compass_ctx.fillText('N', centerX, centerY - labelRadius);

    // Other directions (black)
    compass_ctx.fillStyle = '#2c3e50';
    compass_ctx.font = 'bold 16px Arial';
    compass_ctx.fillText('S', centerX, centerY + labelRadius);
    compass_ctx.fillText('E', centerX + labelRadius, centerY);
    compass_ctx.fillText('O', centerX - labelRadius, centerY);

    // Restore context (stop rotation)
    compass_ctx.restore();

    // Draw target bearing needle (red) - no label
    if (target_bearing !== null) {
        if (current_heading !== null) {
            // Calculate relative bearing (target bearing relative to current heading)
            let relativeBearing = target_bearing - current_heading;
            if (relativeBearing < 0) relativeBearing += 360;
            if (relativeBearing >= 360) relativeBearing -= 360;
            draw_compass_needle(centerX, centerY, radius - 30, relativeBearing, '#e74c3c', 4, '');
        } else {
            // No phone heading available, show absolute target bearing
            draw_compass_needle(centerX, centerY, radius - 30, target_bearing, '#e74c3c', 4, '');
        }
    }

    // Draw phone direction indicator (blue arrow pointing up) - no label
    if (current_heading !== null) {
        draw_compass_needle(centerX, centerY, radius - 20, 0, '#3498db', 3, '');
    }

    // Draw center dot
    compass_ctx.beginPath();
    compass_ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    compass_ctx.fillStyle = '#34495e';
    compass_ctx.fill();

    // Show message if no heading available
    if (current_heading === null) {
        compass_ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        compass_ctx.font = '12px Arial';
        compass_ctx.textAlign = 'center';
        compass_ctx.textBaseline = 'middle';
        compass_ctx.fillText('Orientation non', centerX, centerY + 25);
        compass_ctx.fillText('disponible', centerX, centerY + 40);
    }
}

function draw_compass_needle(centerX, centerY, length, angle, color, lineWidth, label) {
    const radian = (angle - 90) * Math.PI / 180; // -90 to make 0° point north

    // Needle line
    compass_ctx.strokeStyle = color;
    compass_ctx.lineWidth = lineWidth;
    compass_ctx.beginPath();
    compass_ctx.moveTo(centerX, centerY);
    compass_ctx.lineTo(
        centerX + length * Math.cos(radian),
        centerY + length * Math.sin(radian)
    );
    compass_ctx.stroke();

    // Needle tip (triangle)
    const tipX = centerX + length * Math.cos(radian);
    const tipY = centerY + length * Math.sin(radian);

    compass_ctx.fillStyle = color;
    compass_ctx.beginPath();
    compass_ctx.moveTo(tipX, tipY);
    compass_ctx.lineTo(
        tipX - 8 * Math.cos(radian - Math.PI/6),
        tipY - 8 * Math.sin(radian - Math.PI/6)
    );
    compass_ctx.lineTo(
        tipX - 8 * Math.cos(radian + Math.PI/6),
        tipY - 8 * Math.sin(radian + Math.PI/6)
    );
    compass_ctx.closePath();
    compass_ctx.fill();
}

function update_compass_heading(heading) {
    current_heading = heading;
    draw_compass();
}

function update_compass_target_bearing(bearing) {
    target_bearing = bearing;
    draw_compass();
}

function init_compass() {
    compass_canvas = document.getElementById("visual_compass");
    if (compass_canvas) {
        compass_ctx = compass_canvas.getContext("2d");

        // Make canvas responsive
        const container = compass_canvas.parentElement;
        const size = Math.min(200, container.clientWidth - 40);
        compass_canvas.width = size;
        compass_canvas.height = size;

        draw_compass();

        // Request permission for device orientation (iOS 13+)
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        startCompass();
                    } else {
                        console.log('Device orientation permission denied');
                    }
                })
                .catch(error => {
                    console.log('Error requesting device orientation permission:', error);
                    // Try without permission request (older browsers)
                    startCompass();
                });
        } else {
            // For browsers that don't require permission
            startCompass();
        }
    }
}

function startCompass() {
    if (window.DeviceOrientationEvent) {
        // Priority approach like NOAA compass
        if ('ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
            compassEventType = "absolute";
        } else {
            window.addEventListener('deviceorientation', handleOrientation, true);
            compassEventType = "relative";
        }
        orientation_events_added = true;
        console.log('Compass orientation listeners added');
    } else {
        orientation_events_added = false;
        console.log('Device orientation not supported');
    }
}

let lastHeading = null;
let lastUpdateTime = 0;
const HEADING_UPDATE_INTERVAL = 100; // Update every 100ms for smoothness
const ERRATIC_JUMP_THRESHOLD = 30; // Filter jumps > 30°

function handleOrientation(event) {
    let heading = null;
    let debugSource = "";

    // Platform-specific handling like NOAA compass
    if (event.webkitCompassHeading !== undefined) {
        // iOS Safari - use webkit compass heading directly
        heading = event.webkitCompassHeading;
        debugSource = "webkit";
    } else if (event.alpha !== null && event.alpha !== undefined) {
        // Android and other platforms
        let alpha = event.alpha;

        // Apply orientation corrections for landscape mode
        if (window.orientation === 90) {
            alpha = alpha - 90;
        } else if (window.orientation === -90) {
            alpha = alpha + 90;
        } else if (window.orientation === 180) {
            alpha = alpha + 180;
        }

        // Convert to compass heading (NOAA style)
        heading = 360 - alpha;
        debugSource = compassEventType;
    }

    // Filter out invalid readings
    if (heading === null || heading === undefined || isNaN(heading)) {
        return;
    }

    // Normalize heading to 0-360
    heading = ((heading % 360) + 360) % 360;

    // Light debounce - only update every 100ms for smoothness
    const now = Date.now();
    if (now - lastUpdateTime < HEADING_UPDATE_INTERVAL) {
        return;
    }

    // Filter out erratic jumps (but allow gradual changes)
    if (lastHeading !== null) {
        // Calculate smallest difference accounting for wrap-around
        let diff = Math.abs(heading - lastHeading);
        let diffWrap1 = Math.abs(heading - lastHeading + 360);
        let diffWrap2 = Math.abs(heading - lastHeading - 360);
        let minDiff = Math.min(diff, diffWrap1, diffWrap2);

        // Reject erratic jumps but allow all reasonable changes
        if (minDiff > ERRATIC_JUMP_THRESHOLD) {
            console.log(`Filtering erratic jump: ${lastHeading}° → ${heading}° (${minDiff}°)`);
            return;
        }
    }

    lastHeading = heading;
    lastUpdateTime = now;

    update_compass_heading(heading);

    // Update map compass bearing line in real-time
    compass_bearing = heading;
    redraw();

    // Also update the text display
    const headingElement = document.querySelector('#heading');
    if (headingElement) {
        headingElement.innerHTML = `Direction actuelle:<br>${bearing_to_cardinal(heading)} (${Math.round(heading)}°)`;
    }
}


function init_simple_map() {
    c = document.getElementById("simple_map");
    ctx = c.getContext("2d");

    // Initialize compass
    init_compass();

    //document.querySelector('#move').addEventListener('click', do_simulate_move);

    window.addEventListener('resize', () => {
        onResize();
        redraw();

        // Also resize compass
        if (compass_canvas) {
            const container = compass_canvas.parentElement;
            const size = Math.min(200, container.clientWidth - 40);
            compass_canvas.width = size;
            compass_canvas.height = size;
            draw_compass();
        }
    })

    onResize();
    redraw();
}
