import NovationXL
import System.Posix.Unistd

eventLoop novationXL state = do
  nanosleep 1000000000
  newState <- updateNovationXLState novationXL state
  print newState
  eventLoop novationXL newState


main = do
  maybeNxl <- initNovationXL
  maybe (print "Controler not found") (\novationXL -> eventLoop novationXL initNovationXLState) maybeNxl
