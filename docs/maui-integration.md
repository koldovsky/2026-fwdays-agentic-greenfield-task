# Integrating an ONNX Model into a .NET MAUI Application

This document describes how to run an ONNX Object Detection model locally inside a .NET MAUI application using ONNX Runtime.

The model used in this repository was trained with Azure Custom Vision and exported as ONNX, but the same integration approach can be applied to many other ONNX-compatible models.

---

# Overview

The complete inference pipeline looks like this:

```text
User Selects Image
          ↓
Load Image
          ↓
Crop to Centered Square
          ↓
Resize to 320 x 320
          ↓
Convert to Tensor
          ↓
ONNX Runtime
          ↓
Object Detection Results
          ↓
Display Results
```

Unlike cloud-based AI services, the entire process runs locally on the device.

Benefits include:

* Offline operation
* Lower latency
* No API costs
* Better privacy

---

# Required Packages

Install the following NuGet packages:

```xml
<PackageReference Include="Microsoft.ML.OnnxRuntime" />
<PackageReference Include="SkiaSharp" />
```

Purpose:

| Package                  | Purpose                         |
| ------------------------ | ------------------------------- |
| Microsoft.ML.OnnxRuntime | Executes the ONNX model         |
| SkiaSharp                | Image loading and preprocessing |

---

# Adding Model Assets

Place the exported model files inside:

```text
Resources
└── Raw
    ├── model.onnx
    └── labels.txt
```

Example:

```text
Resources/Raw/model.onnx
Resources/Raw/labels.txt
```

The model file contains the neural network.

The labels file contains the class names returned by the model.

Example:

```text
stop-sign
```

---

# Understanding the Model

Before writing any code, inspect the model using Netron.

For this demo:

Input:

```text
image_tensor
float32[1,3,320,320]
```

Outputs:

```text
detected_boxes
detected_classes
detected_scores
```

Understanding these values is critical because the application must generate input data in exactly the format expected by the model.

---

# Loading the Model

MAUI assets are embedded inside the application package.

ONNX Runtime requires a physical file path.

Because of this, the model must first be copied to local storage.

Example workflow:

```text
Resources/Raw/model.onnx
            ↓
FileSystem.AppDataDirectory
            ↓
InferenceSession
```

Typical implementation:

```csharp
var modelPath =
    Path.Combine(
        FileSystem.AppDataDirectory,
        "model.onnx");
```

Copy the model if it does not already exist.

Then create the session:

```csharp
_session = new InferenceSession(modelPath);
```

The session can be reused for the entire lifetime of the application.

Creating a new session for every prediction is not recommended.

---

# Loading Labels

The labels file maps class IDs to human-readable names, one per line.

For this model the mapping is zero-based:

```text
0 -> no-entry
1 -> parking-prohibited
2 -> stop-sign
```

Load labels once during application startup.

Store them in memory for reuse.

---

# Image Preprocessing

This is one of the most important steps.

The model expects:

```text
float32[1,3,320,320]
```

Breaking this down:

```text
1 = Batch Size
3 = RGB Channels
320 = Height
320 = Width
```

This means every image must be transformed into exactly that format before inference.

---

# Cropping and Resizing Images

The selected image may have any resolution and aspect ratio:

```text
4032 x 3024
1920 x 1080
1280 x 720
```

The model expects a square input:

```text
320 x 320
```

Do not stretch a non-square photo directly to 320 x 320. Stretching distorts the subject differently depending on orientation — a portrait photo gets squashed horizontally, a landscape one vertically — which can make detection fail in one orientation while working in the other.

Instead, crop the image to its largest centered square first, then resize:

```text
Original Image
        ↓
Crop to Centered Square
        ↓
Resize to 320 x 320
```

This keeps the subject undistorted and frame-filling in any orientation. SkiaSharp can be used for both the crop and the resize.

Note: because only the centered square is analyzed, keep the subject centered in the frame.

---

# Creating the Tensor

After resizing, convert pixel values into a tensor.

This model expects **raw RGB values in the 0–255 range** — do not normalize them:

```text
255 → 255.0
128 → 128.0
0   → 0.0
```

This is one of the most important gotchas in the whole project. Custom Vision compact models subtract 127.5 internally. If you divide by 255 yourself, the model effectively receives a near-black image and returns zero detections.

```csharp
tensor[0, 0, y, x] = pixel.Red;   // raw 0-255, no division
tensor[0, 1, y, x] = pixel.Green;
tensor[0, 2, y, x] = pixel.Blue;
```

Tensor layout:

```text
[1,3,320,320]
```

Channel-first format:

```text
Batch
Channel
Height
Width
```

Important:

Many developers assume:

```text
[1,320,320,3]
```

This is incorrect for this model.

The model uses:

```text
NCHW
```

not:

```text
NHWC
```

This was one of the first things verified using Netron.

---

# Running Inference

Create the input:

```csharp
NamedOnnxValue.CreateFromTensor(
    "image_tensor",
    tensor);
```

The input name must exactly match the model definition.

In this case:

```text
image_tensor
```

Run the model:

```csharp
_session.Run(inputs);
```

The output is a collection containing all output tensors.

---

# Parsing Results

The model returns three outputs:

```text
detected_boxes
detected_classes
detected_scores
```

Each detection consists of:

```text
Bounding Box
Class ID
Confidence Score
```

Example:

```text
Class: stop-sign
Confidence: 0.96
```

---

# Confidence Threshold

Object detection models usually return many low-confidence predictions.

Apply a threshold:

```csharp
0.5f
```

Example:

```text
0.92 → Keep
0.81 → Keep
0.18 → Ignore
```

This reduces noise and false positives.

---

# Class ID Mapping

Class indexing is worth verifying for every export.

This model is zero-based, so the class ID maps directly to the labels array:

```csharp
labels[classId]
```

For example, class ID 0 maps to:

```text
labels[0] = no-entry
```

Some other Custom Vision exports are one-based and return Class ID 1 for the first class. In that case you must offset:

```csharp
labels[classId - 1]
```

If detections display a raw number such as:

```text
Class 1
```

instead of a name, check the class index mapping first.

---

# Common Pitfalls

## Incorrect Tensor Shape

The most common issue.

Expected:

```text
[1,3,320,320]
```

Accidentally generating:

```text
[1,320,320,3]
```

will produce incorrect predictions.

---

## Wrong Input Name

The input name must match:

```text
image_tensor
```

exactly.

Verify using Netron.

---

## Model Not Found

ONNX Runtime requires a physical file path.

Ensure the model is copied from:

```text
Resources/Raw
```

to:

```text
FileSystem.AppDataDirectory
```

before creating the session.

---

## Low Accuracy

Low accuracy is usually caused by:

* Insufficient training images
* Lack of negative examples
* Poor image diversity

It is rarely caused by ONNX Runtime itself.

---

# Lessons Learned

The most surprising discovery during this project was that integrating ONNX Runtime into MAUI was relatively straightforward.

The harder challenge was improving model quality.

An early version of the model was trained using only STOP signs.

As a result, it frequently classified other red road signs as STOP signs.

Adding additional sign categories such as:

* No Entry
* Parking Prohibited

improved results significantly.

The inference code remained unchanged.

Only the training dataset improved.

This reinforces one of the most important lessons in machine learning:

> Better data often produces better results than better code.

---

# Next Steps

Potential improvements:

* Real-time camera detection
* More traffic sign categories
* Document detection
* Business card detection
* OCR preprocessing
* Hybrid Edge AI and Cloud AI workflows

The same integration approach can be reused for many mobile AI scenarios beyond traffic sign detection.
