module NovationXL(NovationXL, NovationXLState, initNovationXL,
                  initNovationXLState, readNovationXLUpdate) where
-- This module exposes the knobs and sliders of the NovationXL controller as a Matrix.
-- The controller can be purchased here:
-- http://smile.amazon.com/Novation-Launch-Control-XL-Controller/dp/B00LXBC92M/

import qualified Data.Foldable as Foldable
import Data.Maybe
import Data.Matrix
import qualified Sound.PortMidi as Midi

type NovationXL = Midi.PMStream

type NovationXLState = Matrix Double
-- This should always be a 4x8 Matrix in the same layout as the controls
-- the rows go from bottom to top.

initNovationXLState :: NovationXLState
initNovationXLState = matrix 4 8 (const 0.0)

deviceInfoWithId :: Int -> IO (Int, Midi.DeviceInfo)
deviceInfoWithId id = do
  info <- Midi.getDeviceInfo id
  return (id, info)

openMidiDevice :: Int -> IO (Maybe NovationXL)
openMidiDevice id = do
  openResult <- Midi.openInput (fromIntegral id)
  return $ either Just (const Nothing) openResult

midiDeviceIsNovationXL :: Midi.DeviceInfo -> Bool
midiDeviceIsNovationXL d = Midi.input d == True &&
   Midi.name d == "Launch Control XL"

initNovationXL :: IO (Maybe NovationXL)
initNovationXL = do
  Midi.initialize
  numDevices <- Midi.countDevices
  deviceInfos <- mapM deviceInfoWithId [0..numDevices-1]
  deviceId <- return $ listToMaybe [id | (id, d) <- deviceInfos,
      midiDeviceIsNovationXL d]
  maybe (return Nothing) openMidiDevice deviceId

readNovationXLUpdate :: NovationXL -> IO (Maybe (NovationXLState -> NovationXLState))
readNovationXLUpdate nxl = do
  readResult <- Midi.readEvents nxl
  return $ f $ catMaybes $ map getUpdate $ either id (const []) readResult where
    f [] = Nothing
    f updates = Just $ foldr1 (flip (.)) updates
  -- TODO: error handling

novationRowStarts :: [(Int, Int)]
novationRowStarts = zip [1..] [77, 49, 29, 13]

findUpdatePosition :: Midi.PMEvent -> Maybe (Int, Int)
findUpdatePosition event = Foldable.msum $ map f novationRowStarts where
  f (idx, rowStart) = if (control >= rowStart) && (control < rowStart + 8)
    then Just (idx, control - rowStart + 1)  -- Matrix coordinates are one indexed.
    else Nothing
  control = fromIntegral $ Midi.data1 $ Midi.message event

findUpdateValue :: Midi.PMEvent -> Double
findUpdateValue = (/127.0) . fromIntegral . Midi.data2 . Midi.message

getUpdate :: Midi.PMEvent -> Maybe (NovationXLState -> NovationXLState)
getUpdate event = fmap (setElem (findUpdateValue event)) (findUpdatePosition event)
