<?php 
header("Content-Type: text/html;charset=utf-8");

$type = $_GET["t"];

$key = $_GET["k"];

if(empty($type) || empty($key)){
    echo '{"error":"illegal request!"}';
    exit;
}

$protocol = 'http';
if($_SERVER['HTTPS'] === 1) $protocol = 'https';

$currentUrl = $protocol.'://'.$_SERVER['HTTP_HOST'];

switch ($type){
case "xiami":
  	echo getXiami($key);
  	break;
case "netease":
  	echo getNetease($key);
  	break;
case "qqmusic":
  	echo getQQmusic($key);
  	break;
case "kuwo":
  	echo getKuwo($key);
  	break;
case "baidu":
  	echo getBaidu($key);
  	break;
case "baiduMp3":
  	echo getBaiduMp3($key);
  	break;
case "kg5sing":
  	echo getKugou5sing($key);
  	break;
case "kg5singMp3":
  	echo getKugou5singMp3($key);
  	break;
default:
  	header("HTTP/1.0 404 Not Found");
}

exit;

function mylog($s){
	echo $s."<br><br>";
}

function getXiami($ids){
    $flag = 0;
    $mids = explode(",",$ids);
    
    $musics = array();
    
    foreach($mids as $id){
        $url = "http://www.xiami.com/song/playlist/id/".$id;
        
        $out  = file_get_contents($url);
    
        $res = array();
        // id
        $res['id'] = $id;
        
        if($out == ""){
		    $res['error'] = "单曲下架，暂时不能收听";
		}else{
            // title
            if (preg_match("/<songName>(.*?)<\/songName>/i", $out, $match)) {
                $res['name'] = $match[1];
            }
            // artist
            if (preg_match("/<\!\[CDATA\[([^\]].*)\]\]><\/artist>/i", $out, $match)) {
                $res['artist'] = $match[1];
            }
            // mp3
            if (preg_match("/<location>(.*?)<\/location>/i", $out, $match)) {
                $res['mp3'] = ipcxiami($match[1]);
            }
        }
        $musics[$flag++] = $res;
    }
    
    return json_encode($musics);

}

function ipcxiami($location){
    $count = (int)substr($location, 0, 1);
    $url = substr($location, 1);
    $line = floor(strlen($url) / $count);
    $loc_5 = strlen($url) % $count;
    $loc_6 = array();
    $loc_7 = 0;
    $loc_8 = '';
    $loc_9 = '';
    $loc_10 = '';
    
    while ($loc_7 < $loc_5){
        $loc_6[$loc_7] = substr($url, ($line+1)*$loc_7, $line+1);
        $loc_7++;
    }
    
    $loc_7 = $loc_5;
    while($loc_7 < $count){
        $loc_6[$loc_7] = substr($url, $line * ($loc_7 - $loc_5) + ($line + 1) * $loc_5, $line);
        $loc_7++;
    }
    
    $loc_7 = 0;
    while ($loc_7 < strlen($loc_6[0])){
    	$loc_10 = 0;
        while ($loc_10 < count($loc_6)){
            $loc_8 .= @$loc_6[$loc_10][$loc_7];
            $loc_10++;
        }
    	$loc_7++;
    }
    $loc_9 = str_replace('^', 0, urldecode($loc_8));
    
    return $loc_9;
}

function curl($url, $referer="", $header=array(), $useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.152 Safari/537.36", $post=0, $post_data="") {
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 3);
    curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 15);
    curl_setopt($curl, CURLOPT_FOLLOWLOCATION, 1);
    curl_setopt($curl, CURLOPT_HTTPHEADER, $header);
    curl_setopt ($curl, CURLOPT_REFERER, $referer);
    curl_setopt($curl, CURLOPT_USERAGENT, $useragent);
    if ($post == 1) {
        curl_setopt($curl, CURLOPT_POST, 1);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $post_data);
    }
    $src = curl_exec($curl);
    curl_close($curl);
    return $src;
}

function getNetease($ids)
{
    $musics = array();
    
    $url = "http://music.163.com/api/song/detail/?id=" . $ids . "&ids=%5B" . $ids . "%5D";
    $refer = "http://music.163.com/";
    // 模拟网易云访问
    $header[] = "Cookie: " . "appver=1.5.0.75771;";
    $out = curl($url,$refer,$header);
    //mylog($out);
    
    $json = json_decode($out,true);
    //mylog($json);

    
    $songs = $json['songs'];
    $flag = 0;
    
    foreach($songs as $song){
    	$res = array();
        $res['id'] = $song['id'];
    	$res['name'] = $song['name'];
        $res['artist'] = $song['artists'][0]['name'];
        $res['mp3'] = $song['mp3Url'];
        $musics[$flag++] = $res;
    }
    
    //mylog($musics);
    
    return json_encode($musics);

}

function getQQmusic($ids) {
    
    $flag = 0;
    $mids = explode(",",$ids);
    
    $musics = array();
    
    foreach($mids as $mid){
    
        $out  = file_get_contents("http://y.qq.com/portal/song/".$mid.".html",FALSE,NULL,0,1234);
        
        
        //echo '<textarea style="width:100%;height:100%">'.$out.'</textarea>';
        
        
        $res = array();
        $res['id'] = $mid;
        
        // id
        if (preg_match("/<title>(.*?)<\/title>/i", $out, $match)) {
            
            //mylog($match);
            
            $m = explode('-',$match[1]) ;
            
            if(count($m) >= 2){
                // 标题-艺术家 中间的- 不能分割，原因未知
                $res['name'] = $m[0];
                $res['artist'] = '';
            }else{
                $res['name'] = $match[1];
                $res['artist'] = '';
            }
            
            $res['mp3'] = "http://ws.stream.qqmusic.qq.com/C100".$mid.".m4a?fromtag=38";
        }else{
            $res['error'] = "未知歌曲";
        }
        
        //mylog($res);
        
        $musics[$flag++] = $res;
    }
    return json_encode($musics);
}

// 酷我音乐
function getKuwo($ids) {
    
    $flag = 0;
    $mids = explode(",",$ids);
    
    $musics = array();
    
    foreach($mids as $id){
    
        $out  = file_get_contents('http://www.kuwo.cn/yinyue/'.$id.'?catalog=yueku2016',FALSE,NULL,0,1234);
        
        
        //echo '<textarea style="width:100%;height:100%">'.$out.'</textarea>';
        
        
        $res = array();
        $res['id'] = $id;
        
        // id
        if (preg_match("/<title>(.*?)<\/title>/i", $out, $match)) {
            
            //mylog($match);
            
            $m = explode('-',$match[1]);
            
            if(count($m) >= 2){
                $res['name'] = $m[0];
                $res['artist'] = '';
            }else{
                $res['name'] = $match[1];
                $res['artist'] = '';
            }
            
            // http://antiserver.kuwo.cn/anti.s?format=mp3&rid=MUSIC_9864238&type=convert_url&response=url
            $res['mp3'] = file_get_contents('http://antiserver.kuwo.cn/anti.s?type=convert_url&rid=MUSIC_'.$id.'&response=url&format=aac%7Cmp3');
        }else{
            $res['error'] = "未知歌曲";
        }
        
        //mylog($res);
        
        $musics[$flag++] = $res;
    }
    return json_encode($musics);
}

// 百度音乐
function getBaidu($ids) {
    
    $musics = array();
    
    $out = file_get_contents('http://music.baidu.com/data/music/fmlink?songIds='.$ids.'&type=mp3');
    
    $json = json_decode($out,true);
    //mylog($json);

    
    $songs = $json['data']['songList'];
    $flag = 0;
    
    foreach($songs as $song){
    	$res = array();
        $res['id'] = $song['songId'];
    	$res['name'] = $song['songName'];
        $res['artist'] = $song['artistName'];
        // 百度音乐做了防盗链，只能使用 curl Refer 欺骗了，流量伤不起啊！！！
        $res['mp3'] = $currentUrl.'/res/duoshuo/m.php?t=baiduMp3&k='.$song['songLink'];
        $musics[$flag++] = $res;
    }
    
    //mylog($musics);
    
    return json_encode($musics);
}

// 百度音乐链接
function getBaiduMp3($url) {
    header('Content-type: audio/mp3');
    return curl($url,"http://play.baidu.com/");
}

// kugou 5sing 音乐
function getKugou5sing($ids) {

    $ua = "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_0 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8A293 Safari/6531.22.7";

    $flag = 0;
    $mids = explode(",",$ids);
    
    $musics = array();
    
    foreach($mids as $id){
    
        $url = "http://5sing.kugou.com/m/detail/yc-".$id."-1.html";
        
        //mylog($url);
        
        $res = curl($url,"http://5sing.kugou.com/", array(), $ua);
    
        //echo "<script>console.log(".$res."</script>";
        
        preg_match('/[a-zA-z]+:\/\/[^\s]*\.mp3/', $res, $mp3);
        
        //mylog($mp3);
        
        $src =$mp3[0];
        
        preg_match('/song">[^\s]*<\/p>/', $res, $song);
        
        //mylog($song);
        
        $songName = $song[0];
        $songName = substr($songName, 6, count($songName) - 5);
        
        //mylog($songName);
        
        preg_match('/author">[^\s]*<\/p>/', $res, $author);
        
        //mylog($author);
        
        $artistName = $author[0];
        $artistName = substr($artistName, 8, count($artistName) - 5);
           
        //mylog($artistName);
        $res = array();
        $res['id'] = $id;
        if($src && $songName && $artistName){
            $res['name'] = $songName;
            $res['artist'] = $artistName;
            //$res['mp3'] = $src;
            $res['mp3'] = $currentUrl.'/res/duoshuo/m.php?t=kg5singMp3&k='.$src;
        }else{
            //console.error(($artistName.'-'.$songName.'),<'.$src.);
        	$res['error'] = '获取歌曲失败';
        }
        
        
        $musics[$flag++] = $res;
        
    }

    return json_encode($musics);
}

// 5sing 音乐链接
function getKugou5singMp3($url) {
    header('Content-type: audio/mp3');
    //http://data.5sing.kgimg.com/G065/M08/12/13/gQ0DAFe1GXGADiwUAHTtcKc0Z0A129.mp3
    return curl($url,"http://data.5sing.kgimg.com/");
}

?>
