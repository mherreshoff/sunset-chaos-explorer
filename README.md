# sunset-chaos-explorer

## Prerequisites
This program, as currently written, requires the Novation Launch Control XL Controller.
The controller can be purchased here: http://smile.amazon.com/dp/B1LXBC92M/

## Setup
First, install the haskell platform:
https://www.haskell.org/platform/

Then run:
cabal install matrix
cabal install PortMidi

To get the dependancies that don't come with the haskell platform

To build the executable, you simply run the command:
ghc --make SunsetChaosExplorer.hs
