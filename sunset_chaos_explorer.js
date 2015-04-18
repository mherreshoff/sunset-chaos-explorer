// Novation Launch Control XL Midi setup:

var has_midi_controls = false;
function SetupMidiHandler(midi) {
  console.log("midi ready.");
  midi.inputs.forEach(function(input, port) {
    console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
    "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
    "' version:'" + input.version + "'" );
    if (input.name == "Launch Control XL") {
      console.log("Found launch control XL.");
      has_midi_controls = true;
      input.onmidimessage = MidiMessageEventHandler
    }
  });

  if (!has_midi_controls) {
    alert("Couldn't find Launch Control XL, running in random mode.");
  }
}

function MidiFail(error) {
  alert("Could not load MIDI.")
}

var midi_controls = [
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]];

function MidiMessageEventHandler(event) {
//  console.log("Message: " + event.data[0] + ", "
//    + event.data[1] + ", " + event.data[2]);

  var row_starts = [77, 49, 29, 13];
  var row = -1;
  var col = -1;
  for (var r = 0; r < row_starts.length; ++r) {
    if (event.data[1] >= row_starts[r] &&
        event.data[1] < row_starts[r] + 8 ){
      row = r;
      col = event.data[1] - row_starts[r];
    }
  }
  if (row != -1) {
    midi_controls[row][col] = event.data[2] / 127.0;
  }
//  console.log(JSON.stringify(midi_controls));
}

function SetupMidi() {
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(SetupMidiHandler, MidiFail);
  }
}


// Drawing stuff:
// Thanks to Matt Vana for help with JS canvas.
var canvas = document.getElementById("canvas");
var canvas_context = canvas.getContext("2d")

function CoordToX(p) {
  return Math.round((p/6.0 + 0.5) * canvas.width);
}
function CoordToY(p) {
  return Math.round((p/6.0 + 0.5) * canvas.height);
}

var kFadePerFrame = 0.9;
var kIterationsPerFrame = 10000;

var old_p = null;
var old_width = 0;
var old_height = 0;
var image = null;
function RenderFrame() {
  // Read the parameters from the controls:
  var p = new Array();
  var new_p = new Array();

  for (var i = 0; i < 8; ++i) {
    new_p[i] = Math.PI*2 * (midi_controls[0][i] + midi_controls[1][i] / 10.0);
    new_p[9+i] = 1.0 + (midi_controls[2][i] + midi_controls[3][i] / 10.0);
  }
  new_p[8] = 0; new_p[17] = 0;
  if (!old_p) {
    old_p = new_p;
  }

  // Draw the background:
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.9;
  canvas_context.fillStyle = "rgba(0,0,0,1)";

  if (canvas.width == old_width && canvas.height == old_height) {
    var size = canvas.width * canvas.height;
    for (var pix = 0; pix < size; ++pix) {
      for (var i = 0; i < 3; ++i) {
        image.data[4*pix + i] *= kFadePerFrame;
      }
    }
  } else {
    canvas_context.fillRect(0,0,canvas.width,canvas.height);
    image = canvas_context.getImageData(0, 0, canvas.width, canvas.height);
  }

  // Render the strange attractor:
  var x = 0; var y = 0; var z = 0;
  var nx; var ny; var nz;
  function f(p, idx, v) {
    return Math.cos(p[9+idx]*v+p[idx]);
  }
  for (var i = 0; i < kIterationsPerFrame; ++i){
    var new_frac = i/kIterationsPerFrame;
    var old_frac = 1 - new_frac;
    for (var j = 0; j < new_p.length; ++j) {
      p[j] = new_frac * new_p[j] + old_frac * old_p[j];
    }
    var fade = Math.pow(kFadePerFrame, old_frac);
    nx = f(p, 0, x) + f(p, 1, y) + f(p, 2, z);
    ny = f(p, 3, x) + f(p, 4, y) + f(p, 5, z);
    nz = f(p, 6, x) + f(p, 7, y) + f(p, 8, z);
    nz += 0.001 * Math.random();
    x = nx; y = ny; z = nz;
    if (i < 10) {
      continue;
    }
    var color = 3*z;
    var red = (200 + 50*Math.sin(color)) * fade;
    var green = (200 + 50*Math.sin(2+color)) * fade;
    var blue = (100 + 50*Math.sin(4+color)) * fade;
    var px_offset = 4 * (CoordToY(y) *canvas.width + CoordToX(x));
    image.data[px_offset] = red;
    image.data[px_offset + 1] = green;
    image.data[px_offset + 2] = blue;
  }
  canvas_context.putImageData(image, 0, 0);
  old_width = canvas.width;
  old_height = canvas.height;
  old_p = new_p;
}

function EventLoop() {
  window.requestAnimationFrame(EventLoop);
  if (!has_midi_controls) {
    for (var i = 0; i < 8; ++i) {
      midi_controls[0][i] += 0.001 * Math.random()
    }
  }
  RenderFrame();
}

// Launch it:
midi_controls[0][0] = 0.2;
SetupMidi();
EventLoop();

