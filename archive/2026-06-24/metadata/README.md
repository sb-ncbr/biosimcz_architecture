# Metadata schema

This directory contains the BioSim CZ prototype metadata schema. The schema adds domain metadata for molecular simulation records on top of the common repository metadata model.

The model is split into two main parts:

- `schemas/` defines the record structure. It separates Study-level metadata, which describes the deposited dataset as a whole, from Experiment-level metadata, which describes individual computational setups or runs.
- `vocabularies/` defines controlled terms used by the schemas, including molecular-dynamics terms and file semantic types.

