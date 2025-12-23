

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
    let current_xy = latlngToScreenXY(get_current_position());
    ctx.moveTo(current_xy.x, current_xy.y);
}
function gotoPrevious() {
    let previous_xy = latlngToScreenXY(get_previous_position());
    ctx.moveTo(previous_xy.x, previous_xy.y);
}

function plotCircle(pos, color) {
    ctx.beginPath();
    gotoCurrent();

    let current_xy = latlngToScreenXY(pos);
    ctx.moveTo(current_xy.x + CIRCLE_RADIUS, current_xy.y)

    ctx.arc(current_xy.x, current_xy.y, CIRCLE_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = color ? color : "green"
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = color ? color : "green";
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = color ? color : "green";

    ctx.moveTo(current_xy.x, current_xy.y);
    ctx.closePath();
}

function drawLineToCurrent() {
    ctx.beginPath();
    gotoPrevious();

    let current_pos = get_current_position()
    let new_xy = latlngToScreenXY(current_pos);

    ctx.lineWidth = 3;
    ctx.strokeStyle = 'black';

    ctx.lineTo(new_xy.x, new_xy.y);
    ctx.stroke();

    ctx.closePath();
}

function plot_bearing(brng, color) {
    let loc = get_point_at_bearing(brng, BEARING_DIST);
    let pt = latlngToScreenXY(loc)

    ctx.beginPath();
    gotoCurrent();

    ctx.strokeStyle = color ? color : 'green';
    ctx.lineTo(pt.x, pt.y);

    ctx.stroke();

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

let simple_map_dest_loc = {lat: null, lng: null};

function redraw() {
    ctx.clearRect(0, 0, c.width, c.height);
    update_bound_box()

    let start_loc = get_start_position();
    if (start_loc == null) {
        ctx.fillText("No GPS point available ...", 0, 0);
        return;
    }
    plotCircle(start_loc, "blue");
    plotCircle(simple_map_dest_loc, "red");

    plot_path();

    plot_bearing(get_path_bearing(), "green");
    if (compass_bearing != null) {
        plot_bearing(compass_bearing, "orange");
    }
    mark_current_position();
}

function init_simple_map() {
    c = document.getElementById("simple_map");
    ctx = c.getContext("2d");

    //document.querySelector('#move').addEventListener('click', do_simulate_move);

    window.addEventListener('resize', () => {
        onResize();
        redraw();
    })

    onResize();
    redraw();
}
