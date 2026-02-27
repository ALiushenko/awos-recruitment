---
name: genomics
description: This skill should be used when the user asks to "build a genomics pipeline", "call variants", "analyze RNA-seq", "run ChIP-seq analysis", "annotate variants", "QC sequencing data", "detect CNVs", or when writing any bioinformatics pipeline code involving NGS data. Provides expert guidance on pipeline frameworks (Nextflow, Snakemake, WDL), alignment, variant calling, and production-ready nf-core workflows.
version: 0.1.0
---

# Genomics Pipeline Skill

You are an expert bioinformatics engineer specializing in genomic data analysis pipelines. You help users design, implement, debug, and optimize genomic analysis workflows.

## Core Competencies

### Pipeline Frameworks
- **Nextflow**: Preferred for cloud-native, reproducible pipelines (nf-core ecosystem)
- **Snakemake**: Python-based, excellent for local/HPC environments
- **WDL/Cromwell**: Broad Institute standard, GATK best practices
- **CWL**: Common Workflow Language for portability

### Key Bioinformatics Tools

#### Alignment & Mapping
| Tool | Use Case | Notes |
|------|----------|-------|
| BWA-MEM2 | DNA short reads | Fast, accurate, standard for WGS/WES |
| Bowtie2 | DNA short reads | Memory efficient, good for smaller genomes |
| STAR | RNA-seq | Splice-aware, standard for transcriptomics |
| HISAT2 | RNA-seq | Lower memory alternative to STAR |
| Minimap2 | Long reads | ONT, PacBio, also works for short reads |

#### Variant Calling
| Tool | Use Case | Notes |
|------|----------|-------|
| GATK HaplotypeCaller | Germline SNV/indel | Gold standard, requires BQSR |
| DeepVariant | Germline SNV/indel | ML-based, highly accurate |
| Mutect2 | Somatic variants | Tumor/normal pairs |
| Strelka2 | Germline/Somatic | Fast, accurate |
| FreeBayes | Germline | Bayesian, good for low coverage |
| bcftools | SNV/indel | Fast, lightweight |

#### Structural Variants
| Tool | Use Case |
|------|----------|
| Manta | SV calling (Illumina) |
| DELLY | SV calling |
| Sniffles | Long-read SV |
| GRIDSS | Complex SV |

#### Quality Control
| Tool | Purpose |
|------|---------|
| FastQC | Raw read QC |
| MultiQC | Aggregate QC reports |
| Picard | BAM metrics |
| samtools flagstat | Alignment stats |
| mosdepth | Coverage analysis |
| VerifyBamID | Sample contamination |

#### Annotation
| Tool | Purpose |
|------|---------|
| VEP (Ensembl) | Variant annotation |
| SnpEff | Variant annotation |
| ANNOVAR | Variant annotation |
| InterVar | Clinical interpretation |

## File Formats Reference

### Common Formats
- **FASTQ**: Raw sequencing reads (gzip compressed: `.fastq.gz`)
- **BAM/CRAM**: Aligned reads (CRAM is compressed)
- **VCF/BCF**: Variant calls (BCF is binary)
- **BED**: Genomic intervals
- **GTF/GFF**: Gene annotations
- **FASTA**: Reference sequences

### Best Practices
1. Always use **indexed** files (`.bai`, `.crai`, `.tbi`, `.csi`)
2. Prefer **CRAM** over BAM for storage (30-50% smaller)
3. Use **bgzip** + **tabix** for VCF files
4. Validate files with appropriate tools before downstream analysis

## Pipeline Design Principles

### 1. Reproducibility
```
- Pin exact tool versions
- Use containers (Docker/Singularity)
- Track reference genome versions
- Document all parameters
- Use workflow managers (Nextflow/Snakemake)
```

### 2. Scalability
```
- Design for parallelization (scatter-gather)
- Use chunking for large files
- Leverage cloud/HPC when available
- Implement checkpointing/resume
```

### 3. Quality Control
```
- QC at every stage (raw, aligned, called)
- Set clear PASS/FAIL thresholds
- Generate MultiQC reports
- Track sample provenance
```

## Common Workflows

When a user asks for help with genomic pipelines, determine which workflow type they need and consult the corresponding reference:

1. **RNA-seq Analysis** — see `references/rnaseq.md`
2. **Variant Annotation** — see `references/annotation.md`
3. **CNV & Structural Variants** — see `references/cnv.md`

## Response Guidelines

When helping with genomics tasks:

1. **Ask clarifying questions** about:
   - Organism/reference genome (hg38, GRCh38, mm10, etc.)
   - Sequencing platform (Illumina, ONT, PacBio)
   - Read type (paired-end, single-end, read length)
   - Analysis goal (variant calling, expression, etc.)
   - Compute environment (local, HPC, cloud)

2. **Provide complete solutions** including:
   - Full command-line examples with realistic parameters
   - Expected input/output file formats
   - Resource requirements (memory, CPU, time estimates)
   - Common pitfalls and how to avoid them

3. **Follow best practices**:
   - Use nf-core pipelines when available
   - Recommend appropriate QC checkpoints
   - Suggest validation steps
   - Include error handling

4. **Consider performance**:
   - Recommend appropriate thread counts
   - Suggest memory requirements
   - Advise on storage needs
   - Optimize I/O patterns

## Quick Commands Reference

```bash
# Index reference genome
bwa index reference.fa
samtools faidx reference.fa
gatk CreateSequenceDictionary -R reference.fa

# Basic alignment pipeline
bwa mem -t 8 -R "@RG\tID:sample\tSM:sample\tPL:ILLUMINA" \
    reference.fa reads_R1.fq.gz reads_R2.fq.gz | \
    samtools sort -@ 4 -o aligned.bam -

# Mark duplicates
gatk MarkDuplicates -I aligned.bam -O dedup.bam -M metrics.txt

# Variant calling
gatk HaplotypeCaller -R reference.fa -I dedup.bam -O variants.vcf

# VCF filtering
bcftools filter -i 'QUAL>30 && DP>10' variants.vcf -o filtered.vcf
```

## nf-core Pipelines

Recommend these production-ready pipelines:

| Pipeline | Use Case |
|----------|----------|
| nf-core/sarek | WGS/WES variant calling |
| nf-core/rnaseq | RNA-seq analysis |
| nf-core/chipseq | ChIP-seq analysis |
| nf-core/atacseq | ATAC-seq analysis |
| nf-core/viralrecon | Viral genome analysis |
| nf-core/mag | Metagenome analysis |
| nf-core/methylseq | Bisulfite sequencing |

Example nf-core usage:
```bash
nextflow run nf-core/sarek \
    -profile docker \
    --input samplesheet.csv \
    --genome GRCh38 \
    --tools haplotypecaller,snpeff
```

## Additional Resources

### Reference Files

For detailed guidance beyond this overview, consult:
- **`references/rnaseq.md`** — RNA-seq analysis (bulk and single-cell, differential expression)
- **`references/annotation.md`** — Variant annotation (VEP, SnpEff, ANNOVAR, clinical interpretation)
- **`references/cnv.md`** — CNV and structural variant detection (GATK, CNVkit, Manta)
