use rusqlite::{params, Connection, DatabaseName};
use serde::Deserialize;
use serde_json::json;
use sha1::{Digest, Sha1};
use sha2::Sha256;
use std::io::{Cursor, Write};
use zip::{write::SimpleFileOptions, ZipWriter};

#[derive(Default, Deserialize, specta::Type)]
#[serde(default, rename_all = "camelCase")]
pub struct AnkiRow {
    word: String,
    description: String,
    machine_translation: String,
    ai_translation: String,
    examples: String,
    conversation: String,
}

fn html(value: &str) -> String {
    value.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
        .replace('\r', "").replace('\n', "<br>").replace('\u{1f}', " ")
}
fn stable_id(value: &str) -> i64 {
    let hash = Sha256::digest(value.as_bytes());
    (i64::from_be_bytes(hash[..8].try_into().unwrap()) & 0x000f_ffff_ffff_ffff) + 1
}
fn package(rows: &[AnkiRow]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    if rows.is_empty() || rows.len() > 20000 { return Err("请收藏 1 至 20000 条内容后导出。".into()); }
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_secs() as i64;
    let mut db = Connection::open_in_memory()?;
    db.execute_batch("CREATE TABLE col(id integer primary key,crt integer,mod integer,scm integer,ver integer,dty integer,usn integer,ls integer,conf text,models text,decks text,dconf text,tags text);
CREATE TABLE notes(id integer primary key,guid text,mid integer,mod integer,usn integer,tags text,flds text,sfld integer,csum integer,flags integer,data text);
CREATE TABLE cards(id integer primary key,nid integer,did integer,ord integer,mod integer,usn integer,type integer,queue integer,due integer,ivl integer,factor integer,reps integer,lapses integer,left integer,odue integer,odid integer,flags integer,data text);
CREATE TABLE revlog(id integer primary key,cid integer,usn integer,ease integer,ivl integer,lastIvl integer,factor integer,time integer,type integer);
CREATE TABLE graves(usn integer,oid integer,type integer);
CREATE INDEX ix_notes_guid ON notes(guid); CREATE INDEX ix_cards_nid ON cards(nid);")?;
    let model_id=1700000011i64;
    let deck_id=1700000012i64;
    let fields = ["English", "Chinese", "Machine", "AI", "Examples", "Conversation"];
    let extra="{{#Examples}}<h3>例句</h3>{{Examples}}{{/Examples}}{{#Conversation}}<h3>追问笔记</h3>{{Conversation}}{{/Conversation}}";
    let model=json!({"id":model_id.to_string(),"name":"NextAI Study 双向表达","type":0,"mod":now,"usn":-1,"sortf":0,"did":deck_id,"tags":[],"vers":[],"latexPre":"","latexPost":"","latexsvg":false,
      "css":".card{font-family:Arial,sans-serif;font-size:22px;text-align:left;line-height:1.6;padding:16px}h3{font-size:16px;opacity:.65;margin-bottom:4px}.hint{font-size:14px;opacity:.65}",
      "flds":fields.iter().enumerate().map(|(ord,name)|json!({"name":name,"ord":ord,"sticky":false,"rtl":false,"font":"Arial","size":20,"media":[]})).collect::<Vec<_>>(),
      "req":[[0,"all",[0]],[1,"all",[1]]],"tmpls":[
      {"name":"英 → 中","ord":0,"qfmt":"<div class=hint>解释这个英文表达</div>{{English}}","afmt":format!("{{{{FrontSide}}}}<hr id=answer>{{{{Chinese}}}}{{{{#Machine}}}}<h3>机翻</h3>{{{{Machine}}}}{{{{/Machine}}}}{{{{#AI}}}}<h3>AI 译文</h3>{{{{AI}}}}{{{{/AI}}}}{extra}"),"bqfmt":"","bafmt":"","did":null,"bfont":"","bsize":0},
      {"name":"中 → 英","ord":1,"qfmt":"<div class=hint>用英语表达</div>{{Chinese}}","afmt":format!("{{{{FrontSide}}}}<hr id=answer>{{{{English}}}}{extra}"),"bqfmt":"","bafmt":"","did":null,"bfont":"","bsize":0}]});
    let deck=|id:i64,name:&str| json!({"id":id,"name":name,"mod":now,"usn":-1,"desc":"","dyn":0,"collapsed":false,"browserCollapsed":false,"extendNew":0,"extendRev":0,"conf":1,"newToday":[0,0],"revToday":[0,0],"lrnToday":[0,0],"timeToday":[0,0]});
    let conf=json!({"activeDecks":[deck_id],"curDeck":deck_id,"newSpread":0,"collapseTime":1200,"timeLim":0,"estTimes":true,"dueCounts":true,"curModel":model_id.to_string(),"nextPos":rows.len()*2+1});
    let dconf=json!({"1":{"id":1,"name":"Default","mod":0,"usn":0,"maxTaken":60,"autoplay":true,"timer":0,"replayq":true,"new":{"bury":true,"delays":[1,10],"initialFactor":2500,"ints":[1,4],"order":1,"perDay":20},"rev":{"bury":true,"ease4":1.3,"fuzz":0.05,"ivlFct":1,"maxIvl":36500,"perDay":200,"hardFactor":1.2},"lapse":{"delays":[10],"leechAction":0,"leechFails":8,"minInt":1,"mult":0}}});
    db.execute("INSERT INTO col VALUES(1,?1,?2,?2,11,0,0,0,?3,?4,?5,?6,'{}')",params![now,now*1000,conf.to_string(),json!({model_id.to_string():model}).to_string(),json!({"1":deck(1,"Default"),deck_id.to_string():deck(deck_id,"NextAI Study")}).to_string(),dconf.to_string()])?;
    let tx=db.transaction()?;
    for (index,row) in rows.iter().enumerate() {
        let word=row.word.trim();
        if word.is_empty() || word.len()+row.description.len()+row.examples.len()+row.conversation.len()+row.ai_translation.len()+row.machine_translation.len()>200000 {return Err("收藏内容为空或过长。".into());}
        let chinese=if !row.ai_translation.trim().is_empty(){&row.ai_translation}else if !row.machine_translation.trim().is_empty(){&row.machine_translation}else{&row.description};
        if chinese.trim().is_empty(){return Err(format!("缺少译文：{word}").into());}
        let values=[word,chinese,&row.machine_translation,&row.ai_translation,&row.examples,&row.conversation];
        let flds=values.iter().map(|value|html(value)).collect::<Vec<_>>().join("\u{1f}");
        let nid=stable_id(&format!("nextai-study:note:{word}"));
        let guid=format!("{:016x}",nid);
        let checksum=Sha1::digest(word.as_bytes());
        let csum=u32::from_be_bytes(checksum[..4].try_into()?) as i64;
        tx.execute("INSERT INTO notes VALUES(?1,?2,?3,?4,-1,' nextai-study ',?5,?6,?7,0,'')",params![nid,guid,model_id,now,flds,word,csum])?;
        for ord in 0..2 {
            let cid=stable_id(&format!("nextai-study:card:{ord}:{word}"));
            tx.execute("INSERT INTO cards VALUES(?1,?2,?3,?4,?5,-1,0,0,?6,0,2500,0,0,0,0,0,0,'')",params![cid,nid,deck_id,ord,now,(index*2+ord as usize+1) as i64])?;
        }
    }
    tx.commit()?;
    let bytes=db.serialize(DatabaseName::Main)?;
    let mut zip=ZipWriter::new(Cursor::new(Vec::new()));
    zip.start_file("collection.anki2",SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored))?;
    zip.write_all(&bytes)?;
    zip.start_file("media",SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored))?;
    zip.write_all(b"{}")?;
    Ok(zip.finish()?.into_inner())
}

#[tauri::command]
#[specta::specta]
pub fn build_anki_package(rows: Vec<AnkiRow>) -> Result<Vec<u8>,String> {
    package(&rows).map_err(|error|error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;
    #[test]
    fn bidirectional_package_keeps_identity_and_escapes_content() {
        let row=AnkiRow{word:"take ownership".into(),machine_translation:"承担责任".into(),ai_translation:"主动负责".into(),examples:"<script>alert(1)</script>".into(),..Default::default()};
        let bytes=package(&[row]).unwrap();
        let mut archive=zip::ZipArchive::new(Cursor::new(bytes)).unwrap();
        let mut db_bytes=Vec::new();archive.by_name("collection.anki2").unwrap().read_to_end(&mut db_bytes).unwrap();
        let file=std::env::temp_dir().join(format!("nextai-apkg-test-{}.anki2",std::process::id()));
        std::fs::write(&file,db_bytes).unwrap();
        let db=Connection::open(&file).unwrap();
        assert_eq!(db.query_row("SELECT count(*) FROM notes",[],|r|r.get::<_,i64>(0)).unwrap(),1);
        assert_eq!(db.query_row("SELECT count(*) FROM cards",[],|r|r.get::<_,i64>(0)).unwrap(),2);
        let flds:String=db.query_row("SELECT flds FROM notes",[],|r|r.get(0)).unwrap();
        assert!(flds.contains("&lt;script&gt;"));assert!(flds.contains("主动负责"));
        assert_eq!(stable_id("nextai-study:note:take ownership"),db.query_row("SELECT id FROM notes",[],|r|r.get::<_,i64>(0)).unwrap());
        drop(db);std::fs::remove_file(file).unwrap();
        assert!(package(&[]).is_err());
    }
}
