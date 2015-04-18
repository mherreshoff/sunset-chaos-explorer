# sunset-chaos-explorer

## Description
This program allows you to use a MIDI controler to manipulate the parameters of a very high dimensional space of 3D strange attractors.
(The third dimension is rendered as color.)

## Prerequisites
There are two versions of this program.  Both versions as currently written, requires the Novation Launch Control XL Controller.  (Though if the javascript version is launched without a controller it will fall back to random mode.)
The controller can be purchased here:
http://smile.amazon.com/Novation-Launch-Control-XL-Controller/dp/B00LXBC92M/

The javascript version is currently faster.

## Javscript Setup
This javascript depends on the web MIDI api.
http://www.w3.org/TR/webmidi/

I have tested it on the beta version of chrome.  As of April 18, 2015 the beta version of chrome (version 43) supports API, though I expect the non-beta version to support it soon.

Once you have installed the beta version of chrome, you can just plug in the controler and then navigate to the "index.html" in this directory, or if you haven't downloaded the repository, you can go to:

http://rawgit.com/mherreshoff/sunset-chaos-explorer/master/index.html

## Haskell Setup
First, install the haskell platform:
https://www.haskell.org/platform/

Then run:

cabal install matrix

cabal install PortMidi

To get the dependancies that don't come with the haskell platform

To build the executable, you simply run the command:

ghc --make SunsetChaosExplorer.hs
