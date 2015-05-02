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
  return Math.round((p/10.0 + 0.5) * (canvas.width-1))
}
function CoordToY(p) {
  return Math.round((p/10.0 + 0.5) * (canvas.height-1));
}

var kParamChangePerFrame = 0.2;
var kFadePerFrame = 0.9;
var kIterationsPerFrame = 10000;

var frame_start_controls = null;
var frame_end_controls = null;
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

var cur_theta = 0;
function RenderFrame() {
  // Read the parameters from the controls:
  var input_controls = new Array(32);

  for (var r = 0; r < 4; ++r) {
    for (var c = 0; c < 8; ++c) {
      input_controls[r*8+c] = midi_controls[r][c];
    }
  }

  // Compute the range of motion for the parameters this frame
  if (frame_end_controls) {
    for (var i = 0; i < input_controls.length; ++i) {
      frame_end_controls[i] = kParamChangePerFrame * input_controls[i] +
        (1-kParamChangePerFrame) * frame_end_controls[i];;
    }
  } else {
    frame_end_controls = input_controls;
  }

  if (!frame_start_controls) {
    frame_start_controls = frame_end_controls;
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
    console.log("resize!")
    canvas_context.fillRect(0,0,canvas.width,canvas.height);
    image = canvas_context.getImageData(0, 0, canvas.width, canvas.height);
  }

  // Render the strange attractor:
  var x = 0; var y = 0; var z = 0;
  var nx; var ny; var nz;
  var tau = 2*Math.PI;
  function f(theta, v) {
    return Math.cos(v+theta);
  }
  function rn(x) {
    return x * (2*Math.random(1.0)-1)
  }
  var controls = new Array(input_controls.length);
  for (var i = 0; i < kIterationsPerFrame; ++i){
    var new_frac = i/kIterationsPerFrame;
    var old_frac = 1 - new_frac;
    for (var j = 0; j < input_controls.length; ++j) {
      controls[j] = new_frac * frame_end_controls[j] + old_frac * frame_start_controls[j];
    }
    
    // Extract the parameters from the controls
    var p = new Array(9);
    var c = new Array(8);
    var a = new Array(8);
    for (var j = 0; j < 8; ++j) {
      a[j] = controls[j];  // misc controls
      c[j] = controls[8+j];  // color controls
      p[j] = tau * (controls[16+j] + controls[24+j] / 10.0);
        // strange attractor parameters.
    }
    p[8] = 0;

    var noise = 0.001 + 0.5*a[7]

    nx = f(p[0], x) + f(p[1], y) + f(p[2], z) + rn(noise)
    ny = f(p[3], x) + f(p[4], y) + f(p[5], z) + rn(noise)
    nz = f(p[6], x) + f(p[7], y) + f(p[8], z) + rn(noise)

    var q = a[0]
    var x1 = (1-q)*x + q*nx
    var y1 = (1-q)*y + q*ny
    var z1 = (1-q)*z + q*nz

    x = nx; y = ny; z = nz;

    //warp:
    var color_wave = f(tau*c[1], x1) + f(tau*c[2], y1) + f(tau*c[3], z1)
    var color = color_wave*(1+5*c[0]) + tau*c[4]
    var color_scale = 1 + .3 * a[1]*Math.sin(color+a[2]*tau)
    x1 *= color_scale
    y1 *= color_scale
    z1 *= color_scale

    // rotate (x, z):
    var theta1 = tau * a[4] + cur_theta
    var x2 = x1 * Math.cos(theta1) + z1 * Math.sin(theta1)
    var y2 = y1
    var z2 = - x1 * Math.sin(theta1) + z1 * Math.cos(theta1)

    // rotate (y, z):
    var theta2 = tau * a[5]
    var x3 = x2
    var y3 = y2 * Math.cos(theta2) + z2 * Math.sin(theta2)
    var z3 = - y2 * Math.sin(theta2) + z2 * Math.cos(theta2)

    var fade = Math.pow(kFadePerFrame, old_frac);

    if (Math.abs(x3) < 5 && Math.abs(y3) < 5) {
      var red = (color_offsets[0] + 50*(1-c[5])*Math.sin(color)) * fade;
      var green = (color_offsets[1] + 50*(1-c[6])*Math.sin(2+color)) * fade;
      var blue = (color_offsets[2] + 50*(1-c[7])*Math.sin(4+color)) * fade;
      var px_offset = 4 * (CoordToY(y3) *canvas.width + CoordToX(x3));
      image.data[px_offset] = red;
      image.data[px_offset + 1] = green;
      image.data[px_offset + 2] = blue;
    }
  }
  canvas_context.putImageData(image, 0, 0);

  // Setup for next frame:
  old_width = canvas.width;
  old_height = canvas.height;
  frame_start_controls = frame_end_controls;
  cur_theta += 0.001;
}

function EventLoop() {
  window.requestAnimationFrame(EventLoop);
  if (!has_midi_controls) {
    for (var i = 0; i < 8; ++i) {
      midi_controls[2][i] += 0.001 * Math.random()
    }
  }
  RenderFrame();
}

// Launch it:
midi_controls[2][2] = 0.3;
SetupMidi();
EventLoop();

