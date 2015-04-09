module NovationXL(NovationXL, NovationXLState, initNovationXL, initNovationXLState, updateNovationXLState) where
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

updateNovationXLState :: NovationXL -> NovationXLState -> IO (NovationXLState)
updateNovationXLState nxl ns = do
  readResult <- Midi.readEvents nxl
  return $ either (foldl applyUpdate ns) (const ns) readResult
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

applyUpdate :: NovationXLState -> Midi.PMEvent -> NovationXLState
applyUpdate ns event = maybe ns f (findUpdatePosition event) where
  f pos = setElem (findUpdateValue event) pos ns
  

