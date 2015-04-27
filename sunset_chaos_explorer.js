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

var midi_button_press = function (group, idx) {
  console.log("button press: " + group + ", " + idx);
}
// reassign this to get other behaviors.

function MidiMessageEventHandler(event) {
//  console.log("Message: " + event.data[0] + ", "
//    + event.data[1] + ", " + event.data[2]);

  var row_starts = [77, 49, 29, 13];
  if (event.data[0] == 176) {
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
  }
//  console.log(JSON.stringify(midi_controls));

  var button_group_starts = [41, 57, 73, 89, 105];
  if (event.data[0] == 144 && event.data[2] == 127) {
    for (var g = 0; g < button_group_starts.length; ++g) {
      if (event.data[1] >= button_group_starts[g] &&
          event.data[1] < button_group_starts[g] + 4 ){
        midi_button_press(g, event.data[1]-button_group_starts[g]);
      }
    }
  }
  if (event.data[0] == 176 && event.data[2] == 127) {
    if (event.data[1] >= 104 && event.data[1] <= 107) {
      midi_button_press(5, event.data[1]-104);
    }
  }
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

var kParamChangePerFrame = 0.2;
var kFadePerFrame = 0.9;
var kIterationsPerFrame = 10000;

var frame_start_params = null;
var frame_end_params = null;
var old_width = 0;
var old_height = 0;
var image = null;

var color_offsets = [200, 200, 100];

midi_button_press = function (group, idx) {
  if (group < 4) {
    var color = (4*group + idx)*2*Math.PI/16;
    color_offsets[0] = Math.min(200, 150+80*Math.sin(color))
    color_offsets[1] = Math.min(200, 150+80*Math.sin(color+2))
    color_offsets[2] = Math.min(200, 150+80*Math.sin(color+4))
  } else if (group == 4) {
    midi_controls[0][idx] += (Math.random(1) - 0.5) * 0.1
  } else if (group == 5) {
    midi_controls[0][idx] += (Math.random(1) - 0.5)
  }
}

function RenderFrame() {
  // Read the parameters from the controls:
  var input_params = new Array(22);
  for (var i = 0; i < input_params.length; ++i) {
   input_params[i] = 0;
  }
  for (var i = 0; i < 7; ++i) {
    input_params[i] = Math.PI*2 * (midi_controls[0][i] + midi_controls[1][i] / 10.0);
    input_params[9+i] = 1.0 + (midi_controls[2][i] + midi_controls[3][i] / 10.0);
  }
  input_params[16] = 1.0;
  input_params[17] = 1.0;
  // Read the last four parameters directly from the last column.
  for (var i = 0; i < 4; ++i){
    input_params[18+i] = midi_controls[i][7]
  }

  // Compute the range of motion for the parameters this frame
  if (frame_end_params) {
    for (var i = 0; i < input_params.length; ++i) {
      frame_end_params[i] = kParamChangePerFrame * input_params[i] +
        (1-kParamChangePerFrame) * frame_end_params[i];;
    }
  } else {
    frame_end_params = input_params;
  }

  if (!frame_start_params) {
    frame_start_params = frame_end_params;
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
  function r(p) {
    return (p[18]*0.05 + 0.001) * (2*Math.random()-1)
  }
  var p = new Array(input_params.length);
  for (var i = 0; i < kIterationsPerFrame; ++i){
    var new_frac = i/kIterationsPerFrame;
    var old_frac = 1 - new_frac;
    for (var j = 0; j < input_params.length; ++j) {
      p[j] = new_frac * frame_end_params[j] + old_frac * frame_start_params[j];
    }

    var fade = Math.pow(kFadePerFrame, old_frac);

    nx = f(p, 0, x) + f(p, 1, y) + f(p, 2, z) + r(p);
    ny = f(p, 3, x) + f(p, 4, y) + f(p, 5, z) + r(p);
    nz = f(p, 6, x) + f(p, 7, y) + f(p, 8, z) + r(p);
    x = nx; y = ny; z = nz;
    if (i < 10) {
      continue;
    }

    var theta1 = Math.PI*2*p[20]
    var x1 = x * Math.cos(theta1) + z * Math.sin(theta1)
    var y1 = y
    var z1 = - x * Math.sin(theta1) + z * Math.cos(theta1)

    var theta2 = Math.PI*2*p[21]
    var x2 = x1
    var y2 = y1 * Math.cos(theta2) + z1 * Math.sin(theta2)
    var z2 = - y1 * Math.sin(theta2) + z1 * Math.cos(theta2)

    if (Math.abs(x2) < 3 && Math.abs(y2) < 3) {
      var color = 3*z2+p[19]*2*Math.PI
      var red = (color_offsets[0] + 50*Math.sin(color)) * fade;
      var green = (color_offsets[1] + 50*Math.sin(2+color)) * fade;
      var blue = (color_offsets[2] + 50*Math.sin(4+color)) * fade;
      var px_offset = 4 * (CoordToY(y2) *canvas.width + CoordToX(x2));
      image.data[px_offset] = red;
      image.data[px_offset + 1] = green;
      image.data[px_offset + 2] = blue;
    }
  }
  canvas_context.putImageData(image, 0, 0);

  // Setup for next frame:
  old_width = canvas.width;
  old_height = canvas.height;
  frame_start_params = frame_end_params;
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

