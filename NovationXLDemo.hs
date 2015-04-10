import NovationXL
import System.Posix.Unistd

eventLoop novationXL state = do
  nanosleep 1000000000
  update <- readNovationXLUpdate novationXL
  let newState = maybe state ($state) update in do
    print newState
    eventLoop novationXL newState

main = do
  maybeNxl <- initNovationXL
  maybe (print "Controler not found") (\novationXL -> eventLoop novationXL initNovationXLState) maybeNxl
