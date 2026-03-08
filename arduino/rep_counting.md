# Pseudocode for Rep Counting

### Using

- Zhang et al. (2024)
- Krutz et al. (2023)

INPUT:
-- imu_data = {acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z, time}

PROCESS:
-- // Filter & Normalise
-- imu_data = LowPassFilter(imu_data, cutoff = 10Hz)
-- imu_data = Normalise(imu_data, range=[-1,1])

-- // Convert to gloval coordinates using Madgwick filter
-- global_acc = ConvertToGlobalFrame(imu_data)
-- vertical_acc = ExtractVerticalComponent(global_acc)

-- // Integration + High-Pass Filtering
-- velocity = Integtate(vertical_acc)
-- velocity = HighPassFilter(velocity, cutoff=0.16Hz)
-- displacement = Integtate(velocity)
-- displacement = HighPassFilter(displacement, cutoff=0.16Hz)

// Detect Active Lofting Periods Using Sliding Winow Variance
WINDOW_SIZE = 2 seconds
STEP_SIZE = 0.3 seconds
VAR_THRESHOLD = 0.5 m^2s^-4

motion_labels
MIDSV = 0 // Motion Interval Detection State Variable

FOR each window in dispacement:
-- variance = ComputeVariance(window)

-- IF MIDSV == 0 AND variance > VAR_THRESHOLD for 10 consecutive windows
-- -- start_time = current_Time
-- -- MIDSV = 1

-- IF MIDSV == 1 AND variance > VAR_THRESHOLD for 5 consecutive windows
-- -- end_time = current_time
-- -- RecordMotionInterval(start_time, end_time)
-- -- MIDSV

MCSV = 0
rep_count = 0

FOR each data_point in displacement:
-- IF MCSV == 0 local_max > 0.3 \* ma_threshold
-- -- start_time = current_time
-- -- MCSV = 1

-- IF MCSV == 1 AND local_min < 0.3 \* min_threshold
-- -- deepest = current_time
-- -- MCSV = 2

-- IF MCSV == 2 AND local_max > 0.3 \* max_threshold
-- -- end = current_time
-- -- IF ValidateTemporalSequency (start, deepest, end)
-- -- -- rep_count += 1
-- -- -- LabelRep(start, deepest, end)
-- -- MCSV = 0

## Functions Required To Create

- LowPassFilter ✅
- Normalise ✅
- ConvertToGlobalFrame
- ExtractVerticalComponent
- Integrate
- HighPassFilter
