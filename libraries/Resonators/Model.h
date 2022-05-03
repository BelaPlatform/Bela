/*
 * Model:
 * ModelLoader
 * https://github.com/jarmitage/resonators
 *
 */

#include <string>
#include <vector>
#include <fstream>
#include <map>

#include <JSON.h>
#include "Resonators.h"

#ifndef ModelLoader_H_
#define ModelLoader_H_

/*

    ModelLoader provides methods for loading resonant filter bank 'models' as .json files
    (intended to be used with `Resonators.cpp`)

    Example model.json:

        ```javascript
        {
          "metadata": {
            "name": "marimba",
            "fundamental": 800,
            "size": 4
          },
          "resonators": [
            { "freq": 800,  "gain": 0.500000, "decay": 0.2 },
            { "freq": 1600, "gain": 0.033333, "decay": 0.4 },
            { "freq": 2400, "gain": 0.016666, "decay": 0.6 },
            { "freq": 3200, "gain": 0.006666, "decay": 0.7 }
          ]
        }
        ```

    ModelLoader also provides the ability to tranpose these models,
    by frequency, MIDI note or named note (e.g. "c4")

*/

// ModelMetadata
// Data structure for model metadata
typedef struct _ModelMetadata {
    std::wstring name;
    float fundamental;
    int resonators;
} ModelMetadata;

// ModelLoaderOptions
// Data structure for generic "options" or settings
typedef struct _ModelLoaderOptions {
  std::string path;
  bool v = true; // verbose printing
} ModelLoaderOptions;

class ModelLoader {
public:
  ModelLoader(){}
  ~ModelLoader(){}

  // Load a model file, expects a full path to a .json file
  void load(std::string const &_modelPath) {

    opt.path = _modelPath; // Store the model path for future reference

    // Read the JSON file into a `wstring`
    std::wstring data = L"";
    if (readJSONFile (opt.path, data) == false) {
        printf ("[ModelLoader] Error: could not load model JSON file \'%s\'\n", opt.path.c_str());
    } else {

        // Parse the JSON and break out two main child objects `metadata` and `resonators`
        JSONValue *parsedJSON     = JSON::Parse(data.c_str());
        JSONValue *metadataJSON   = parsedJSON->Child(L"metadata");
        JSONValue *resonatorsJSON = parsedJSON->Child(L"resonators");

        // Parse the `metadata` and `resonators` into `metadata` and `model` data structures respectively
        parseMetadataJSON   (metadataJSON);
        parseResonatorsJSON (resonatorsJSON);

        if (opt.v) printf ("[ModelLoader] Loaded model \'%s\'\n", opt.path.c_str());

    }

  }

  // Some standard get functions for obtaining model information
  // TODO: equivalent set functions
  std::vector<ResonatorParams> getModel(){ return model; }
  ModelMetadata getMetadata() { return metadata; }
  std::wstring getName() { return metadata.name; }
  float getFundamental() { return metadata.fundamental; }
  float getF0() { return getFundamental(); } // synonym
  int getSize() { return metadata.resonators; }

  // Model transposition functions exist in two categories: `shift` and `getShifted`.
  // - `shift` functions will shift the loaded model directly
  // - `getShifted` functions will just return a shifted copy and leave the base model alone

  // The functions tranpose the entire model, maintaining the frequency relationships between resonators
  // Models are transposed relative to `metadata.fundamental`, so it assumes this has already been specified correctly

  // Both categories implement the following:
  // `ToFreq`: Set the fundamental to a frequency
  // `ByFreq`: Move the fundamental up/down by a frequency
  // `ToNote`: Set the fundamental to a MIDI note number
  // `ByNotes`: Move the fundamental up/down by a MIDI note number
  // `ToNote`: Set the fundamental to a named note, e.g. "c0" or "as4" (A#4)
  // `ByNotes`: Move the fundamental up/down by a named note

  void shiftToFreq(float targetFreq) {

    if (opt.v) {
        int targetMidi = freqToMidi(targetFreq);
        std::string targetNote = midiToNoteName(targetMidi);
        printf("[Model] Shifted model to fundamental [ Name: \'%s\' | MIDI: %i | Freq: %.2f ]\n", targetNote.c_str(), targetMidi, targetFreq);
    }

    float shiftRatio = targetFreq / metadata.fundamental;
    for (int i = 0; i < metadata.resonators; i++) model[i].freq = shiftRatio * model[i].freq;
    metadata.fundamental = targetFreq;
  }
  void shiftByFreq(float shiftNote) { shiftToFreq(metadata.fundamental + shiftNote); } // does this work if negative? }
  void shiftToNote(float targetNote) { shiftToFreq(midiToFreq(targetNote)); }
  void shiftByNotes(float shiftNote) { shiftToFreq(metadata.fundamental + midiToFreq(shiftNote)); }
  void shiftToNote(std::string targetNote) { return shiftToNote(noteNameToMidi(targetNote)); }
  void shiftByNotes(std::string targetNote) { shiftToFreq(metadata.fundamental + midiToFreq(noteNameToMidi(targetNote))); }

  std::vector<ResonatorParams> getShiftedToFreq(float targetFreq) {

    if (opt.v) {
        int targetMidi = freqToMidi(targetFreq);
        std::string targetNote = midiToNoteName(targetMidi);
        printf("[Model] Returning shifted model with fundamental [ Name: \'%s\' | MIDI: %i | Freq: %.2f ]\n", targetNote.c_str(), targetMidi, targetFreq);
    }

    std::vector<ResonatorParams> shiftedModel;
    shiftedModel.reserve(metadata.resonators);

    float shiftRatio = targetFreq / metadata.fundamental;

    for (int i = 0; i < metadata.resonators; i++) {
        ResonatorParams tmp_p = {shiftRatio * model[i].freq, model[i].gain, model[i].decay};
        shiftedModel.push_back(tmp_p);
    }

    return shiftedModel;

  }
  std::vector<ResonatorParams> getShiftedByFreq(float shiftFreq) {
    return getShiftedToFreq(metadata.fundamental + shiftFreq); // does this work if negative?
  }
  std::vector<ResonatorParams> getShiftedToNote(float targetNote) {
    return getShiftedToFreq(midiToFreq(targetNote));
  }
  std::vector<ResonatorParams> getShiftedByNotes(float shiftNote) {
    return getShiftedToFreq(metadata.fundamental + midiToFreq(shiftNote)); // does this work if negative?
  }
  std::vector<ResonatorParams> getShiftedToNote(std::string targetNote) {
    return getShiftedToFreq(midiToFreq(noteNameToMidi(targetNote)));
  }
  std::vector<ResonatorParams> getShiftedByNotes(std::string shiftNote) {
    return getShiftedToFreq(metadata.fundamental + midiToFreq(noteNameToMidi(shiftNote))); // does this work if negative?
  }

  // TODO: delete at some point and provide better debug functions if needed
  void debugPrintModel(){
    for (int i = 0; i < model.size(); ++i){
      printf("%i f:%f g:%f d:%f\n", i, model[i].freq, model[i].gain, model[i].decay);
    }
  }

private:

    ModelLoaderOptions opt = {};
    ModelMetadata metadata = {};

    std::vector<ResonatorParams> model;

    // Used by load() to do the initial read of the JSON file
    bool readJSONFile(std::string filename, std::wstring &data) {

        // Create a wide input file stream and check that it opened correctly
        std::wifstream in(filename.c_str());
        if (in.is_open() == false) return false;

        // Iterate over the file and fill the contents into `data`
        std::wstring line;
        data = L"";
        while (getline(in, line)) {
            data += line;
            if (!in.eof()) data += L"\n";
        }

        return true;
    }

    // Used by load() to parse the model metadata
    void parseMetadataJSON(JSONValue* mdJSON) {

        JSONObject mdObj = mdJSON->AsObject();

        // TODO: Add more type validation
        metadata.name = (std::wstring) mdObj[L"name"]->AsString();
        metadata.fundamental = (float) mdObj[L"fundamental"]->AsNumber();
        metadata.resonators = (int) mdObj[L"resonators"]->AsNumber();

        if (opt.v) {
            printf("\n[ModelLoader] Metadata\n\n");
            printf("    Name:        %ls\n",  metadata.name.c_str());
            printf("    Fundamental: %.2f\n", metadata.fundamental);
            printf("    Resonators:  %i\n",   metadata.resonators);
            printf("\n");
        }

    }

    // Used by load() to parse the model resonators array
    void parseResonatorsJSON(JSONValue* resJSON) {

        if (opt.v) {
          printf("\n[ModelLoader] Resonators\n\n");
          printf("    # |  Freq   |  Gain  |  Decay\n");
          printf("   -------------------------------\n");
        }

        JSONArray resArray = resJSON->AsArray();

        for (unsigned int i = 0; i < resArray.size(); i++) {

            // TODO: Add more type validation
            JSONObject resObj = resArray[i]->AsObject();

            // TODO: Add more type validation
            float tmp_f = (float) resObj[L"freq"]->AsNumber();
            float tmp_g = (float) resObj[L"gain"]->AsNumber();
            float tmp_d = (float) resObj[L"decay"]->AsNumber();

            ResonatorParams tmp_p = {tmp_f, tmp_g, tmp_d};
            model.push_back(tmp_p); // TODO: does this actually work when reloading? use emplace instead?

            if (opt.v) printf ("    %i | %.2f | %.3f | %.3f\n", i, tmp_f, tmp_g, tmp_d);

        }

        if (opt.v) printf("\n");

    }

    // The below utils could probably be integrated into the Bela "standard library"
    // Related issue: https://github.com/BelaPlatform/Bela/issues/554

    std::map<std::string, int> midiNoteNames = {                                                                 {"a0",21}, {"as0",22}, {"b0",23},
        {"c1",24}, {"cs1",25}, {"d1",26}, {"ds1",27}, {"e1",28}, {"f1", 29}, {"fs1",30}, {"g1", 31}, {"gs1",32}, {"a1",33}, {"as1",34}, {"b1",35},
        {"c2",36}, {"cs2",37}, {"d2",38}, {"ds2",39}, {"e2",40}, {"f2", 41}, {"fs2",42}, {"g2", 43}, {"gs2",44}, {"a2",45}, {"as2",46}, {"b2",47},
        {"c3",48}, {"cs3",49}, {"d3",50}, {"ds3",51}, {"e3",52}, {"f3", 53}, {"fs3",54}, {"g3", 55}, {"gs3",56}, {"a3",57}, {"as3",58}, {"b3",59},
        {"c4",60}, {"cs4",61}, {"d4",62}, {"ds4",63}, {"e4",64}, {"f4", 65}, {"fs4",66}, {"g4", 67}, {"gs4",68}, {"a4",69}, {"as4",70}, {"b4",71},
        {"c5",72}, {"cs5",73}, {"d5",74}, {"ds5",75}, {"e5",76}, {"f5", 77}, {"fs5",78}, {"g5", 79}, {"gs5",80}, {"a5",81}, {"as5",82}, {"b5",83},
        {"c6",84}, {"cs6",85}, {"d6",86}, {"ds6",87}, {"e6",88}, {"f6", 89}, {"fs6",90}, {"g6", 91}, {"gs6",92}, {"a6",93}, {"as6",94}, {"b6",95},
        {"c7",96}, {"cs7",97}, {"d7",98}, {"ds7",99}, {"e7",100},{"f7", 101},{"fs7",102},{"g7", 103},{"gs7",104},{"a7",105},{"as7",106},{"b7",107},
        {"c8",108},{"cs8",109},{"d8",110},{"ds8",111},{"e8",112},{"f8", 113},{"fs8",114},{"g8", 115},{"gs8",116},{"a8",117},{"as8",118},{"b8",119},
        {"c9",120},{"cs9",121},{"d9",122},{"e9", 123},{"f9",124},{"fs9",125},{"g9", 126},{"gs9",127}
    };

    float midiToFreq (int _note) { return 27.5 * pow(2, (((float)_note - 21)/12)); }
    int freqToMidi (float _freq) { return (12/log(2)) * log(_freq/27.5) + 21; }
    int noteNameToMidi (std::string noteName) {
        auto findNote = midiNoteNames.find(noteName);
        if (findNote != midiNoteNames.end()){
            return findNote->second;
        }
        else {
            if (opt.v) printf("[Model] Error: note not found \'%ls\'\n", noteName.c_str());
            return -1;
        }
    }
    float noteNameToFreq (std::string noteName) { return midiToFreq(noteNameToMidi(noteName)); }
    std::string midiToNoteName(int _note) {
        std::map<std::string, int>::const_iterator it;

        for (it = midiNoteNames.begin(); it != midiNoteNames.end(); ++it)
            if (it->second == _note) return it->first;

        return "[Model] Error: note out of range?";
    }
    std::string freqToNoteName(float _freq) { return midiToNoteName(freqToMidi(_freq)); }

};

#endif /* ModelLoader_H_ */
