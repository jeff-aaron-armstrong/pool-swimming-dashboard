from pathlib import Path
import struct, json
import numpy as np

FIT_FILES = {
    # "28 Sep": Path("raw/PoolSwim20260928075952.fit"),
}

def parse_fit(path):
    data = path.read_bytes()
    hs = data[0]
    ds = struct.unpack_from("<I", data, 4)[0]
    pos, end = hs, hs + ds
    defs, lengths, events = {}, [], []

    while pos < end:
        hdr = data[pos]; pos += 1
        if hdr & 0x80:
            local=(hdr>>5)&0x03
            g, fields, endian = defs[local]
            rec={}
            for num,size,base in fields:
                rec[num]=(data[pos:pos+size],base,endian); pos += size
            if g == 101: lengths.append(rec)
            elif g == 21: events.append(rec)
            continue

        is_def=bool(hdr&0x40); has_dev=bool(hdr&0x20); local=hdr&0x0F
        if is_def:
            arch=data[pos+1]; endian="<" if arch==0 else ">"
            g=struct.unpack_from(endian+"H",data,pos+2)[0]
            nf=data[pos+4]; pos += 5
            fields=[]
            for _ in range(nf):
                fields.append((data[pos],data[pos+1],data[pos+2])); pos += 3
            if has_dev:
                nd=data[pos]; pos += 1+3*nd
            defs[local]=(g,fields,endian)
        else:
            g,fields,endian=defs[local]
            rec={}
            for num,size,base in fields:
                rec[num]=(data[pos:pos+size],base,endian); pos += size
            if g == 101: lengths.append(rec)
            elif g == 21: events.append(rec)

    def dec(rec,num):
        if num not in rec: return None
        raw,base,endian=rec[num]
        if base in (0,2) and len(raw)==1:
            return None if raw[0]==0xFF else raw[0]
        if base==132 and len(raw)==2:
            v=struct.unpack(endian+"H",raw)[0]; return None if v==0xFFFF else v
        if base==134 and len(raw)==4:
            v=struct.unpack(endian+"I",raw)[0]; return None if v==0xFFFFFFFF else v
        if base==1 and len(raw)==1:
            v=struct.unpack("b",raw)[0]; return None if v==0x7F else v
        return int.from_bytes(raw,"little" if endian=="<" else "big")

    active=[]
    for r in lengths:
        if dec(r,12)==1 and dec(r,4) is not None:
            strokes=dec(r,5)
            split=dec(r,4)/1000
            active.append({
                "timestamp":dec(r,253),
                "split_s":split,
                "pace_s_per_100m":split*4,
                "strokes":strokes,
                "cadence":dec(r,9),
                "distance_per_stroke_m":25/strokes if strokes else None
            })

    ts=np.array([r["timestamp"] for r in active],dtype=float)
    pauses=[]
    for r in events:
        if dec(r,0)==0 and dec(r,1)==4:
            t=dec(r,253)
            idx=int(np.argmin(np.abs(ts-t)))+1
            if idx < len(active): pauses.append(idx)
    return active, sorted(set(pauses))

def best_pause_free_500(active, pauses):
    bounds=[0]+pauses+[len(active)]
    candidates=[]
    for a,b in zip(bounds[:-1],bounds[1:]):
        for start in range(a,b-20+1):
            vals=active[start:start+20]
            total=sum(v["split_s"] for v in vals)
            candidates.append((total/5,start,start+20,vals))
    return min(candidates,key=lambda x:x[0])
