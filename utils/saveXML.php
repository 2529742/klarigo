<?php
//$xmlDOM = $_POST['xmlData'];
$xmlDOM = file_get_contents('php://input');
$myFile = "kb.xml";
$fh = fopen($myFile, 'w') or die("can't open file");
fwrite($fh, $xmlDOM);
fclose($fh);

//echo $doc->saveXML();
?>