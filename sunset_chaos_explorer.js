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
    midi_controls[0][0] = 0.2;
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
  navigator.requestMIDIAccess().then(SetupMidiHandler, MidiFail);
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

function RenderFrame() {
  // Read the parameters from the controls:
  var p = new Array();
  var q = new Array();

  for (var i = 0; i < 8; ++i) {
    p[i] = Math.PI*2 * (midi_controls[0][i] + midi_controls[1][i] / 10.0);
    q[i] = 1.0 + (midi_controls[2][i] + midi_controls[3][i] / 10.0);
  }
  p[8] = 0;
  q[8] = 0;

  // Draw the background:
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.9;
  canvas_context.fillStyle = "rgba(0,0,0,1)";
  canvas_context.fillRect(0,0,canvas.width,canvas.height);

  var image = canvas_context.getImageData(0, 0, canvas.width, canvas.height);

  // Render the strange attractor:
  var x = 0; var y = 0; var z = 0;
  var nx; var ny; var nz;
  for (var i = 0; i < 20000; ++i){
    nx = Math.cos(q[0]*x+p[0]) + Math.cos(q[1]*y+p[1]) + Math.cos(q[2]*z+p[2]);
    ny = Math.cos(q[3]*x+p[3]) + Math.cos(q[4]*y+p[4]) + Math.cos(q[5]*z+p[5]);
    nz = Math.cos(q[6]*x+p[6]) + Math.cos(q[7]*y+p[7]) + Math.cos(q[8]*z+p[8]);
    nz += 0.001 * Math.random();
    x = nx; y = ny; z = nz;
    var color = 3*z;
    var red = Math.round(200 + 50*Math.sin(color));
    var green = Math.round(200 + 50*Math.sin(2+color));
    var blue = Math.round(100 + 50*Math.sin(4+color));
    var px_offset = 4 * (CoordToY(y) *canvas.width + CoordToX(x));
    image.data[px_offset] = red;
    image.data[px_offset + 1] = green;
    image.data[px_offset + 2] = blue;
  }
  canvas_context.putImageData(image, 0, 0);
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
SetupMidi();
EventLoop();

