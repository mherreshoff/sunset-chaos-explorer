import qualified Graphics.UI.GLUT as G
import Data.Matrix
import Data.Maybe
import Data.IORef
import NovationXL

type Vec3D = Matrix Double
-- This ought to be a 3x1 column vector

type Parameters = (Matrix Double, Matrix Double)
-- These ought to be 3x3 matrices

(&*), (&+) :: (Num a) => Matrix a -> Matrix a -> Matrix a
(&*) = elementwise (*)
(&+) = elementwise (+)
infix 7 &*
infix 6 &+


rowSum :: (Num a) => Matrix a -> Matrix a
rowSum m = m * (matrix 3 1 (const 1))

nextPoint :: Parameters -> Vec3D -> Vec3D
nextPoint (mult, shift) v = rowSum $ fmap cos $ (vt <-> vt <-> vt) &* mult &+ shift where
  vt = transpose v

fractalPoints :: Parameters -> [Vec3D]
fractalPoints p = iterate (nextPoint p) (matrix 3 1 (const 0.0))

type GLPoint = (G.GLfloat,G.GLfloat,G.GLfloat)
vec2GLPoint :: Vec3D -> GLPoint
vec2GLPoint v = (x!(1,1), x!(2,1), 0) where x = fmap (realToFrac.(/3.0)) v

drawVec3D :: Vec3D -> IO()
drawVec3D v = do
  G.color $ G.Color3 r g b
  G.vertex $ G.Vertex3 x y 0.0 where
    x, y, theta, r, g, b :: G.GLfloat
    x = realToFrac $ v!(1,1)/3.0
    y = realToFrac $ v!(2,1)/3.0
    theta = realToFrac $ v!(3,1)
    r = 0.8 + 0.2 * sin(theta)
    g = 0.4 + 0.2 * sin(theta+2.0)
    b = 0.2 + 0.2 * sin(theta+4.0)

main :: IO ()
main = do
  novationXL <- initNovationXL
  maybe (print "Controller Not Found") initGraphics novationXL

initGraphics :: NovationXL -> IO ()
initGraphics novationXL = do
  (_progName, _args) <- G.getArgsAndInitialize
  G.initialDisplayMode G.$= [G.DoubleBuffered]
  _window <- G.createWindow "Sunset Chaos Explorer"
  state <- newIORef initNovationXLState
  G.displayCallback G.$= display novationXL state
  G.reshapeCallback G.$= Just reshape
  G.idleCallback G.$= Just idle
  G.mainLoop

idle :: G.IdleCallback
idle = G.postRedisplay Nothing

reshape :: G.ReshapeCallback
reshape size = do
  G.viewport G.$= (G.Position 0 0, size)
  G.postRedisplay Nothing

stateToParameters :: NovationXLState -> Parameters
stateToParameters state = (mult, shift) where
  mult = fmap (1.0+) $ scaleMatrix 2 $ input2 3 4 
  shift = scaleMatrix (2*pi) $ input2 1 2 
  input2 coarse fine = input coarse &+ scaleMatrix 0.1 (input fine)
  input row = matrix 3 3 get where
    get (3, 3) = 0.0  -- The input only has eight columns of dials.
    get (i, j) = state!(row, (i-1)*3+j)
 
decapitate :: Int -> [a] -> [a]
decapitate 0 as = as
decapitate n (a:as) = decapitate (n-1) as

display :: NovationXL -> (IORef NovationXLState) -> G.DisplayCallback
display novationXL state = do 
  update <- readNovationXLUpdate novationXL
  modifyIORef' state (fromMaybe id update)
  currentState <- readIORef state
  G.clear [G.ColorBuffer]
  G.renderPrimitive G.Points $
    sequence_ $ map drawVec3D $ decapitate 10 $ take 20000 $
    fractalPoints (stateToParameters currentState)
  G.swapBuffers
